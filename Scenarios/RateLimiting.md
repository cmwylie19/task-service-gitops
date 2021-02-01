# Rate Limiting     
_API Gateways are the first stop from the outside world before reaching your application services (monoliths, microservices, serverless functions, etc)._

 _Any given application service will need to accept requests from the outside.  The problem is that too many incoming requests within a window of time can cause a service or application to crash or become unresponsive. A deliberate example of this would be a Denial of Service Attack._

 _The traditional way to combat this problem is to write rate limiting rules into the application itself. Image if you have an application with 40-50 microservices, this could be quite cumbersome, especially if your rate limiting rules are constantly in flux. An API Gateway you can enforce Rate Limits globally, which takes the overhead off the developers and makes it easier to keep up to date._

## Background
We are going to setup rate limiting for our Task-Service Nodejs app to use Gloo Edge with Envoy's rate-limiting API. _This feature is only available in the enterprise version of Gloo Edge._ You must get an enterprise API Key for this part.

```
glooctl install gateway enterprise --license-key=<license-key>
```

## Steps
- Install Gloo (see Background)
- Deploy `Task-Service` in Kubernetes
- Update the Gloo Edge Settings manifest to configure the rate limiting descriptors
- Configure Envoy rate limiting actions in the `VirtualService`

## Deploy `Task-Service` in Kubernetes
First thing after install Gloo Edge enterprise is to deploy the `Task-Service` app in kubernetes. If you have not been following along so far, the task service is a _very_ single node/express app with 6 endpoints, more information on the app can be found in the [`server.js`](https://github.com/cmwylie19/task-service/blob/master/server.js) file and the [`README.md`](https://github.com/cmwylie19/task-service/blob/master/README.md).

Lets go ahead and deploy the application into kubernetes, if you need a refresher on how to deploy an application into Kubernetes, checkout the first Scenario, 
```
kubectl apply -f k8s/task-service.yaml
```

Once the task-service has a status of `RUNNING` you are done with this step
```
kubectl get pods
```
_or_ if you have `watch` installed on your system
```
watch kubectl get pods
```

## Update the Gloo Edge Settings manifest to configure the rate limiting descriptors
Rate limiting descriptors define an ordered tuple of keys that _have to_ match  in order for the associated rate limit to be applied, (credit, [Gloo Edge Docs](https://docs.solo.io/gloo-edge/latest/guides/security/rate_limiting/envoy/). )

You will create the Rate limit descriptors in the `Gloo Edge Settings manifest`:
```
kubectl get settings default -o yaml -n gloo-system
```

The first Rate Limit descriptor we are going to utilize will limit requests to 2 per minute:

_This would be a very low request rate in production, but it allows us to easily test and prove how Rate Limiting works in Gloo Edge._

The contents of `k8s/patch.yaml` contain the descriptor that are looking to use:
```
spec:
  ratelimit:
    descriptors:
      - key: generic_key
        value: "per-minute"
        rateLimit:
          requestsPerUnit: 2
          unit: MINUTE  
```

We are going to apply the patch to the `Gloo Edge Settings manifest` with the `kubectl patch` command:
```
kubectl patch -n gloo-system settings default --type merge --patch "$(cat k8s/patch.yaml)"
```

Now that we have patched the settings manifest file in `gloo-system` namespace we can apply an action to our Virtual Service to test the results and see it in action.

## Configure Envoy rate limiting actions in the `VirtualService`
The envoy rate limiting actions are applied to a Virtual Service or Individual routes to dictate how the requests are associated with Rate Limiting.

You can specify _more than one rate limit action_, the request is throttled if any one of the actions triggers to signal the rate limiting service to signal throttling.


During the [Traffic Management Scenario](https://github.com/cmwylie19/task-service/blob/master/scenarios/TrafficManagement-RewriteRoutes.md), we used Gloo Edge to rewrite our existing routes in the Nodejs app in a more elegant way, in this scenario we will pick back up exactly where we left off, with all new routes in our `Virtual Service`. 

```
kubectl apply -f k8s/vs-rewrite-final.yaml
```

Now, before moving on further, lets look at how the Task-Service app works with routing rules applied.

First, lets create a task:
```
curl -X POST -H "Content-Type: application/json" -d '{"name":"Rate Limiting"}' $(glooctl proxy url)/api/v1/create 
```

output:
```
Created{
  "id": "4706bd3348b",
  "name": "Rate Limiting",
  "complete": false
}% 
```

We are going to write a short shell script to curl the created task three times, since we have not applied the Rate Limiting action to our route, this should work. **The IDs are generated randomly, use the ID from _YOUR_ output in the command**
```
for x in $(seq 3) do curl -v $(glooctl proxy url)/api/v1/tasks/4706bd3348b; done
```

Pay close attention to the status code HTTP header in the response:
```
< HTTP/1.1 200 OK
```

They should all come back as 200s.

Now lets apply an action to our route in our default `VirtualService` that will match the `per-minute` descriptor in the `Gloo Settings Manifest`.


```
options:
  ratelimit:
    rateLimits:
      - actions:
        - genericKey:
            descriptorValue: "per-minute"
```

The route that we are targeting is `/api/v1/tasks/`, and can be found on line 72 of `k8s/vs-rewrite-final.yaml`.

-------------
**Remember** check the default virtual service in a Kubernetes environment by running:
```
kubectl get vs default -n gloo-system
```
or 
```
glooctl get vs
```
-------------

In order to avoid potential yaml formatting problems I have written the action into the route in a yaml file for you.

Lets apply the yaml file with the Rate Limit action on the `/api/v1/tasks/` route:
```
kubectl apply -f k8s/vs-rewrite-rate-limiting.yaml
```

Now that we have applied the Rate Limit action to the Virtual Service lets run the simple shell command that curls the `/api/v1/tasks/` endpoint 3 times. Remember- we should only get two 200s back, and one `429 Too Many Requests` since our descriptor is set up for 2 requests per minute:
```
for x in $(seq 3); do curl -v $(glooctl proxy url)/api/v1/tasks/4706bd3348b; done 
```

output:
```
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 80 (#0)
> GET /api/v1/tasks/4706bd3348b HTTP/1.1
> Host: localhost
> User-Agent: curl/7.64.1
> Accept: */*
> 
< HTTP/1.1 200 OK
< x-powered-by: Express
< content-type: text/html; charset=utf-8
< content-length: 73
< etag: W/"49-oACCDq5juTi8YdZPrJPxQnPF9Oc"
< date: Tue, 29 Dec 2020 17:11:19 GMT
< x-envoy-upstream-service-time: 0
< server: envoy
< 
{
  "id": "4706bd3348b",
  "name": "Rate Limiting",
  "complete": false
* Connection #0 to host localhost left intact
}* Closing connection 0
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 80 (#0)
> GET /api/v1/tasks/4706bd3348b HTTP/1.1
> Host: localhost
> User-Agent: curl/7.64.1
> Accept: */*
> 
< HTTP/1.1 200 OK
< x-powered-by: Express
< content-type: text/html; charset=utf-8
< content-length: 73
< etag: W/"49-oACCDq5juTi8YdZPrJPxQnPF9Oc"
< date: Tue, 29 Dec 2020 17:11:19 GMT
< x-envoy-upstream-service-time: 0
< server: envoy
< 
{
  "id": "4706bd3348b",
  "name": "Rate Limiting",
  "complete": false
* Connection #0 to host localhost left intact
}* Closing connection 0
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 80 (#0)
> GET /api/v1/tasks/4706bd3348b HTTP/1.1
> Host: localhost
> User-Agent: curl/7.64.1
> Accept: */*
> 
< HTTP/1.1 429 Too Many Requests
< x-envoy-ratelimited: true
< date: Tue, 29 Dec 2020 17:11:19 GMT
< server: envoy
< content-length: 0
< 
* Connection #0 to host localhost left intact
* Closing connection 0
```

If you got an Http Status Code of `429` on the third request you have successfully completed the scenario!


