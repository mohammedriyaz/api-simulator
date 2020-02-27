# api-simulator

When frontend and backend team started working on some feature parallelly, many cases the frontend team needs to wait for backend api/endpoint to progress on frontend development. To avoid those wait times, we could use this api simulator package to mock backend payloads those agreed with backend team. so that the UI mock server will mimic like actual backend api and dispatches mock payloads for frontend api requests.

### It has following key features. 

* Very simple to add mock APIs. Its just matter of creating directory structure like expected api path and added the json file with mock payload
* Customizable behaviors through config file, so that developer doesn't need to know about how this api simulator works
* Feature specific mock data set. Using this, developer can create multiple mock data set those specific to some feature developments

### Key Benefits:

* Avoid frontend team wait times for actual backend endpoints
* Frontend team can demonstrate their work without relying on endpoints
* QA team can change the payload instantly to test different scenarios
* Json data structure can be readily referable from working mock data

## Getting Started

Install api-simulator
```
npm i api-simulator
```
