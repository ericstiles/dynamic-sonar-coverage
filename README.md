# Background
## Problem
I was interested in finding out a way to dynamically increase minimum code coverage requirements as we increased code 
coverage.  Sonar does not provide this type of functionality.

## Solution
Sonar does provide an api (https://sonarcloud.io/web_api/) that can be utilized to manage a project, qualityGates and 
conditions as well the ability for event processing utilizing a web hook.

This repository is a working example to demonstrates increasing minimum code coverage in sonar as the code coverage
in the application increases.  Additionally, there a maximum threshold setting for the `coverage` metric that sonar
will not go over even when the application code coverage does.

### The example
#### Docker Compose File
In docker-compose.yml file all servers, volumes are configured. Ports and IP Addresses are configured.

#### Sonar server
The Sonar Server uses the OOB image provided by Sonarqube.  It is backed by a Postgres DB rather than the installed
h2 instance provided for testing purposes.
In this example a single condition uses the `coverage` metric in a custom qualityGate
A webhook is setup that is triggered when a project analyses occurs.  The webhook is to a node server.
* Sample metric json object (not the whole json object, though) sent through the webhook

       {
          metric: 'coverage',
          operator: 'LESS_THAN',
          value: '50.0',
          status: 'ERROR',
          errorThreshold: '75'
       }

#### Node server
The node server contains the logic that checks for
* any error states and logs those out to the console
* whether the current coverage value is greater than the set threshold and less than the maximum threshold

When coverage value meets the criteria a REST call back to the sonar server updates the errorThreshold with the
floor value of the coverage (Math.floor is used since the coverage will, likely, be a decimal).

# Working example
Some of the steps below are listed to specifically get this example and users should follow a different process for 
rolling out a working model. Two terminals are needed: One from for the docker containers running through 
docker compose and another to run commands in.

All commands should be run from the project root folder.
## Prep
* Install the necessary node modules:
```bash
$ npm install
``` 
* Start the docker containers:
```bash
$ docker-compose up
```
* Watch for the following console log message and proceed when seen

      sonar        | 2019.12.15 18:53:27 INFO  app[][o.s.a.SchedulerImpl] SonarQube is up
      metrics_manager | server (172.19.0.15) is listening on 3000

* Run the below _maven_ command:
```bash
$ mvn clean install sonar:sonar
```

The first time it runs it will automatically create a new project and push the code to that project. 
Login (admin/admin) to the sonar console (http://localhost:9000) to see the project: 
`TestSonarMetricsManager` exists.

* List projects in sonar
```bash
curl -u admin:admin http://localhost:9000/api/projects/search
```

* See the response below noting the project just created from the just run _maven_ command:

      {
        "paging": {
          "pageIndex": 1,
          "pageSize": 100,
          "total": 1
        },
        "components": [
          {
            "organization": "default-organization",
            "id": "AW8K6jbMLChgMJ3Pnnnc",
            "key": "sonar:sonar",
            "name": "TestSonarMetricsManager",
            "qualifier": "TRK",
            "visibility": "public",
            "lastAnalysisDate": "2019-12-15T18:55:15+0000",
            "revision": "17b9d79108b7611643815f9bd575c56f6f94bff3"
          }
        ]
      }
      
* Run the following _curl_ statement to create a custom quality gate:
```bash
$ curl -u admin:admin -X POST -d "name=gatekeeper" http://localhost:9000/api/qualitygates/create
```

* From the above curl statement the returned response is shown below:

      {"id":2,"name":"gatekeeper"}

* Assign to quality gate to the project.  There is no response for this command:
```bash
$ curl -u admin:admin -X POST -d "gateId=2&projectKey=sonar:sonar" http://localhost:9000/api/qualitygates/select
```

* Add `coverage` metric with a 60% threshold to the quality gate:
```bash
$ curl -u admin:admin -X POST -d "gateId=2&error=60&metric=coverage&op=LT" http://localhost:9000/api/qualitygates/create_condition
```

* Note response and condition metric id for `coverage`:

      {"id":6,"metric":"coverage","op":"LT","error":"60"}
      
* Add the sonar webhook and see response:
```bash
$ curl -u admin:admin -X POST -d "name=coverage_hook&project=sonar:sonar&url=http://172.19.0.15:3000" http://localhost:9000/api/webhooks/create
```

* The response below verifies the webhook was successfully created:

    {"webhook":{"key":"AW8LJX5bo7dJpLp7mL8O","name":"coverage_hook","url":"http://172.19.0.15:3000"}}

*NOTE:* You may not see the webhook in the console (Possible sonar bug)

* Run the _maven_ command (`mvn clean install sonar:sonar`) again and see in docker console that it 
fails.  This demonstrates that the webhook is working.

      metrics_manager | run:2019-12-15T20:03:49+0000
      metrics_manager | ------->FAILURE<------
      metrics_manager | {
      metrics_manager |   metric: 'coverage',
      metrics_manager |   operator: 'LESS_THAN',
      metrics_manager |   value: '50.0',
      metrics_manager |   status: 'ERROR',
      metrics_manager |   errorThreshold: '60'
      metrics_manager | }

## Test example
Now we'll update the Code Coverage in our java application and run maven again.

* In the `AppTest.java` class uncomment the following method: 

```java
@Test
public void shouldSubtractOnePositiveNumberFromAnother_ReturnPositiveNumber()
    assertEquals(1, new App().subtraction(Integer.valueOf(2), Integer.valueOf(1)).longValue());
}
```
* Run maven again and not response in the console:

      metrics_manager | Status: 200
      metrics_manager | Body:  { id: 6, metric: 'coverage', op: 'LT', error: '75' }

The metric was updated to 75 percent and can be be confirmed through the console

* In `AppTest.java` uncomment the method:
```java
@Test
public void shouldMultiplyTwoPositiveNumbers()
{
    assertEquals(4, new App().multiplication(Integer.valueOf(2), Integer.valueOf(2)).longValue());
}
```

* Run the maven command again and not the response in the console.  Even though there is 100% coverage (as verified
in the sonar console), the `coverage` metric is only set to 85.

```bash
curl -u admin:admin  -d "id=14&metric=coverage&error=50&op=LT" -X POST http://localhost:9000/api/qualitygates/update_condition
```

# Helpful Links

* https://docs.docker.com/compose/compose-file/
* https://sonarcloud.io/web_api/
