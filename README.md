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

Install globally, so that the command will avaialable from anywhere.

```
npm i -g api-simulator
```

Once you installed, the package will be installed with sample mocks and config file. 

### apisimulator.config.js

[Click here](https://github.com/mohammedriyaz/api-simulator/blob/master/samples/mockApi.config.js) to refer sample config file 

 * apiEndpointExtension -> default value is ".json". ex. "apiEndpointExtension": ".php" or "apiEndpointExtension": ".jsp" and etc
 
 * defaultMockDataPath -> path to mock api response payloads. The api response payloads will be refered from these file path based on give url. ex. "defaultMockDataPath":  "samples/default-mock-dataset"
  - defaultMockDataPath and featureMockDataPath values should be adjecent.
 
 * featureMockDataPath -> path to feature mock datasets folder, it should be absolute or relative to current working directory. its useful to maintain the different data sets for the same route based on configires feature
 
 * baseUrlPath -> base url path. path that needs to appended with api url. default valie is "/mockapi". ex. "baseUrlPath": "/backend". the based url will be based on this value like https//localhost:3030/backend
 
 * useTheseFeatureMocks -> feature data set that needs to be refered for certain api url and rest can refered from default mock dataset. If its given with list of features, it will take mock data from first matched mock endpoint path, otherwise dispatch mock data from root route
 
 * sslCertFiles -> ssl cert files. by default it will uses openssl self signed files those are generated for localhost. As of now it only supports https. 
   Ex. 
   ```
   "sslCertFiles": {
        "key": "samples/key.pem",
        "cert": "samples/cert.pem"
    }
    ```
    
 * ignoreJsonExtension -> Add the route file name that should ignore extension on the endpoint url. 
    ex. if we set "get_user.json", the mockdata will be dispatched for for "https://localhost:3030/backend/sessions/userinfo"
     we should give filename with .json extension
     
     ```
     "ignoreJsonExtension": [
        "userinfo.json",
        "callback.json"
    ]
     ```
 * ignoreQueryStringParameter -> we can provide the api path and the query string parameters those needs to be ignored
   it uses json-server as mock server. json-server provides the quering capabilities based on url query string params. 
   Real case scenario, we should rely on actual api url and it should not affect the defined/expected mockdata. To achive
   that, we could configure the query string params those needs to be ignored like below
    ex. your mockdata for "/backend/level1/api.json?id=1&parentid=1&offset=10" needs to be listed based on id alone and it should not consider parentid and offset.
    you need to set the config like like below.
    ```
    "/backend/level1/api.json": {
            "parentid": "",
            "offset": ""
        }
     ```
   the apisimulator will simply ignore parent & offset values, but it will consider id, because we didn't mention in 
   config. It will match the object like below from the mock data
    /backend/level1/api.json?id=1&parentid=2&offset=10
    ```
    {
      "parentid": 1,
      "id": 1,
      "offset": 0,
      "name": "Riyaz"
    }, ...
    ```
## Step by Steb usage details

1. ### Step 1
   ```
   npm i api-simulator
   ```
      OR
   ```
   npm i -g api-simulator
   ```
   
 2. ### Step 2
    Create config file based on our requirement
    
    ![Create Config File](https://github.com/mohammedriyaz/myreadmeassets/blob/master/mockdataset.png)
     
     ```
     const MOCK_API_CONFIGS = {
       "apiEndpointExtension": ".php",
       // give mockfolder path relative to package. since the package will be in project/node_modules/api-simulator,
       // give relative path of mockdata folders like below
       "defaultMockDataPath":  "../../mocks/defaultMockDataset",
       "featureMockDataPath":  "../../mocks/featureMockDataset",
       "baseUrlPath": "/backend",
       "useTheseFeatureMocks":[],
       "ignoreJsonExtension": [
         "userinfo.json"
       ],
       "ignoreQueryStringParameter": {
         "/backend/books.json": {
           "id": ""
         }
       }
     }

     module.exports = MOCK_API_CONFIGS;
     ```
3. ### Step 3
   
   Create default and feature mock data set
   
   ![Mock Dataset folder stricture](https://github.com/mohammedriyaz/myreadmeassets/blob/master/folderstructure_of_mockdataset.png)
   
4. ### Step 4

   That's it your ready to run your mock server. if you are installed locally, then you need to add npm script command in your package.json file
   
   ```
   "api:simulator": "api-simulator -c mocks/apisimulator.config.js"
   ```
   
5. ### Step 5
   
   Execute following command to run the api-simulator
   
   ```
   npm run api:simulator
   ```
   It will start the api-simulator server and it will be listening port 3030. You can access the mock api from 
   
   ```
   https://localhost:3030/<baseUrlPath>
   ```
   
 6. ### Step 6
 
    Now you can see the mock api responses
    
    *** api without extension ***
    ![api without extension](https://github.com/mohammedriyaz/myreadmeassets/blob/master/apicall_without_extension_1.png)
    
    *** api with extension ***
    ![api with extension](https://github.com/mohammedriyaz/myreadmeassets/blob/master/apicall_with_extension.png)
    
    *** api call which ignores query param as per configuration ***
    ![api call which ignores query params](https://github.com/mohammedriyaz/myreadmeassets/blob/master/apicall_ignored_qr_param.png)
    
    *** api call with filtered mockdata using qr param ***
    ![api call with filtered mockdata using qr param](https://github.com/mohammedriyaz/myreadmeassets/blob/master/apicall_filtered_data_with_qr_param.png)
    
    *** different mockdata with configured feature data sets ***
    ![feature set config](https://github.com/mohammedriyaz/myreadmeassets/blob/master/with_featureset.png)
    
    ![data from configured feature set](https://github.com/mohammedriyaz/myreadmeassets/blob/master/data_from_featureset.png)
    
    ![default and feature data for same api](https://github.com/mohammedriyaz/myreadmeassets/blob/master/data_from_featureset_1.png)
    
    ![data from configured feature set 2](https://github.com/mohammedriyaz/myreadmeassets/blob/master/data_from_featureset2.png)
    
    ![default and feature2 data for same api](https://github.com/mohammedriyaz/myreadmeassets/blob/master/data_from_feature2_1.png)
    
    
## Author

* **Mohammed Riyaz**

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
   
   
   
