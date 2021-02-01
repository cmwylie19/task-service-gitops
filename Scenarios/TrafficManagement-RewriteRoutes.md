# Traffic Management: Rewriting Routes

_During this scenario we will explore Traffic Management features of Gloo Edge that you can use to write routing rules for Virtual Services that control how traffic gets to your application. It is assumed you are running a Kubernetes cluster in a linux environment._

## Background

_Gloo Edge automatically creates Upstreams when it is deployed by way of [discovery services](https://docs.solo.io/gloo-edge/latest/introduction/architecture/#discovery-architecture)._

**_Virtual Services_** define a set of route rules that live under a domain or set of domains. Route rules consist of matchers, which specify the kind of function calls to match (requests and events, are currently supported), and the name of the destination (or destinations) where to route them.

**_Upstreams_** Define destinations for routes. Upstreams tell Gloo Edge what to route to.

Typically, the upstream will be your application or Kubernetes Service, and each Service will have a Virtual Service to control the flow of traffic.

## Steps

- [install `glooctl`](#install-glooctl)
- [install Gloo Edge API Gateway](#install-gloo-edge-api-gateway)
- deploy the task-service application into Kubernetes
- Create a Virtual Service using `glooctl`
- Add routes to your Virtual Service yaml manifest
- Export Virtual Services to yaml for quick deployment and to maintain good `infra as code`.
- Clean up

### Install `glooctl`

To install glooctl locally, execute the command below which downloads the binary and installs it in your path.

```
curl -sL https://run.solo.io/gloo/install | sh
export PATH=$HOME/.gloo/bin:$PATH
```

### Install Gloo Edge API Gateway

Install Gloo Edge using `glooctl`

```
glooctl install gateway
```

### Deploy task-service application to Kubernetes

```
kubectl apply -f k8s/task-service.yaml
```

### Rewrite routes in a Virtual Service 

_Gloo Edge watches for new services to be added to the Kubernetes Cluster. When the application is created, Gloo Edge **automatically creates an Upstream for the Kubernetes Service**. Remember, upstream is the destination for the routes in the Virtual Service which will route to your Kubernetes Service. Gloo Edge also creates Virtual Services for the Kubernetes Services that control how traffic is routed to the Kubernetes Service._

_By default, Gloo Edge **will not** route traffic until we add routing rules on a Virtual Service._

In the previous scenario, we deployed the application into kuberentes and tested some of the routes.

The routes that we tested were:
```
POST /create 
GET /
```

Now that we deployed Gloo Edge Kubernetes Ingress Controller we have a Virtual Service in front of our application, we will need to create new routes to communicate with the application.

The first thing we are going to do is update the Virtual Service to create new routes for the existing POST /create and GET / commands. The goal is to rewrite the `/create` route to be `/api/v1/create` and and the `/` route to `/api/v1/tasks`. These routes exist in the exported Virtual Service `k8s/vs-rewrite.yaml`.

```
kubectl apply -f k8s/vs-rewrite.yaml
```

This yaml file contains the two new routes that were alluded to earlier, `/api/v1/create` and `/api/v1/tasks`:

```
routes:
      - matchers:
          - exact: /api/v1/create
        options:
          prefixRewrite: /create
        routeAction:
          single:
            upstream:
              name: default-task-service-8080
              namespace: gloo-system
      - matchers:
          - exact: /api/v1/tasks
        options:
          prefixRewrite: /
        routeAction:
          single:
            upstream:
              name: default-task-service-8080
              namespace: gloo-system
```

Now that we have applied the new routing rules in the Virtual Service we will test the new routes to make sure they are working as expected. 

Before we do, lets use `glooctl` to checkout the VirtualService that houses these routes.

```
glooctl get vs
```
output:
```
+-----------------+--------------+---------+------+----------+-----------------+---------------------------------------+
| VIRTUAL SERVICE | DISPLAY NAME | DOMAINS | SSL  |  STATUS  | LISTENERPLUGINS |                ROUTES                 |
+-----------------+--------------+---------+------+----------+-----------------+---------------------------------------+
| default         |              | *       | none | Accepted |                 | /api/v1/create ->                     |
|                 |              |         |      |          |                 | gloo-system.default-task-service-8080 |
|                 |              |         |      |          |                 | (upstream)                            |
|                 |              |         |      |          |                 | /api/v1/tasks ->                      |
|                 |              |         |      |          |                 | gloo-system.default-task-service-8080 |
|                 |              |         |      |          |                 | (upstream)                            |
+-----------------+--------------+---------+------+----------+-----------------+---------------------------------------+
```

We can see by the output that we have a VirtualService `default` with routes `/api/v1/create` and `/api/v1/tasks` routing to an Upstream `default-task-service-8080` in the namespace `gloo-system`.

**SIDE NOTE** If you ever find yourself stuck debugging, a good place to start is logging at the logs from the pods in gloo-system 
```
kubectl get pods -n gloo-system
kubectl logs -f <pod-name>
```

Now that we have applied the Virtual Service from the yaml file, lets test it out. First we are going to test our new route `/api/v1/create`
```
➜  task-service git:(master) ✗ curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' $(glooctl proxy url)/api/v1/create 
```
output:
```
Created{
  "id": "0ea005c7686",
  "name": "test",
  "complete": false
}%  
```

You see a similar output to the one that you ran when you `POST /create` in an earlier scenario.

Now lets test the `GET /` with the new route specified in the Virtual Service.

```
➜  task-service git:(master) ✗ curl $(glooctl proxy url)/api/v1/tasks                                                
```
output:
```                  
[{"id":"0ea005c7686","name":"test","complete":false}]% 
```

Again, you should have see the same results as you did when you executed before running the Service as a load balancer.

Next, we are going to write a new routing rule for the `GET /check/healthz` endpoint. We are going to write this rule now using the `glooctl` cli tool which will automatically add the routing rule to our Virtual Service.

```
glooctl add route \
  --path-exact /api/v1/healthz \
  --dest-name default-task-service-8080 \
  --prefix-rewrite /check/healthz
```

_It goes without saying but make sure the `--dest-name` is the appropriate upstream for our app_ I have used the wrong upstream once or twice and had to dig into the logs of the `gloo` pod to figure out why my routes were not working.

This command will create a new route `/api/v1/healthz` on the Upstream `default-task-service-8080` from the old route `/check/healthz`.

Lets test this new route: If all goes correctly, we should recievea response of `pong` back from the task-service.
```
➜  task-service git:(master) ✗ curl $(glooctl proxy url)/api/v1/healthz 
```
output:
```
pong!% 
```

Now that we understand how to create routes in the Virtual Service yaml and from the command line with `glooctl` lets export the the Virtual Service to yaml to maintain good infrastructure as code.

You can find the name of the Virtual Service with the commmand: `glooctl get vs`


Now, lets export the `default` Virtual Service to yaml, sanitize (delete fields, status, metadata.generation, getadata,creationTimestamp, metadata.uid, matadata.selfLink, metadata.resourceVersion) it, and put it back into GIT under `k8s/vs-rewrite-healthz.yaml` so that we can quickly apply the yaml file to get our Virtual Service up and running without having to manually create routes again or allow a GitOps tool like `ArgoCD` to manage our congiration as code by comparing the Yamls in the `k8s` directory with the resources in Kubernetes. If you are not familiar with yaml sanitization, check out the `k8s/vs-rewrite-healthz.yaml` to see how a correctly sanitized yaml file should look.

```
kubectl get vs -n gloo-system default -o yaml > k8s/vs-rewrite-healthz.yaml
```

After you sanitize the yaml file for the default VirtualService you have completed the scenario.  In the next scenario we will look at more advanced traffic management capabilities of Gloo Edge to further enhance our task API. 


### Clean Up

Delete the virtual service

```
kubectl delete vs default -n gloo-system
```

Delete the upstream

```
kubectl delete upstream -n gloo-system default-task-service-8080
```

Delete the task-service Deployment and Service

```
kubectl delete svc,deployment task-service
```
