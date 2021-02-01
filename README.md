[![codecov](https://codecov.io/gh/cmwylie19/task-service/branch/master/graph/badge.svg?token=BRK6V3DOQA)](https://codecov.io/gh/cmwylie19/task-service) ![Node.js CI](https://github.com/cmwylie19/task-service/workflows/Node.js%20CI/badge.svg)

# Task Service

_This is a testing/debugging repo._



## Prereqs

- kubectl
- Docker Desktop with Kubernetes Enabled

## Basic Usage

_This section describes how to run and interact with the application locally_

### Install

Install the application depencies:

```
npm i
```

### Run the app locally

```
npm start
```

### Endpoints

**GET /check/healthz - Check Health**

```
curl http://localhost:3000/check/healthz
```

**POST /create - Create Task**

```
curl -X POST -H "Content-Type: application/json" -d '{"name":"test"}' http://localhost:3000/create
```

**GET / - Get all tasks**

```
curl http://localhost:3000/
```

**PUT /:id - Update a task by ID**
The updated task goes in the body of the POST request.

```
curl -X PUT -H "Content-Type: application/json" -d '{"name":"tester","complete":"true"}' http://localhost:3000/d29e6d58525
```

**DELETE /:id - Delete a task by ID**

```
curl -X DELETE http://localhost:3000/d29e6d58525
```

**GET /:id - Get a task by ID**

```
curl http://localhost:3000/d29e6d58525
```
