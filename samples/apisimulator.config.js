const MOCK_API_CONFIGS = {
    "apiEndpointExtension": ".php",
    // path to deafult mock dataset folder, it should be absolute or relative to current working directory
    "defaultMockDataPath": __dirname + "/default-mock-dataset",
    // path to feature mock datasets folder, it should be absolute or relative to current working directory
    "featureMockDataPath": __dirname + "/feature-mock-datasets",
    // base url path. path that needs to appended with api url. ex. https//localhost:3001/backend
    "baseUrlPath": "/mockapi",
    //we can set feature specific mock data that needs to be dispatched through specific api call.
    // if give list of features, it will take mock data from first matched mock endpoint path, otherwise dispatch mock data from root route
    "useTheseFeatureMocks":["feature1", "feature2"],
    // ssl cert files. by default it will uses openssl self signed files those are generated for localhost
    "sslCertFiles": {
        "key": __dirname + "/key.pem",
        "cert": __dirname + "/cert.pem"
    },
    //Add the route file name that should ignore .json
    // extension on their endpoint. ex. "get_user.json" will be served for "/backend/sessions/get_user"
    "ignoreJsonExtension": [
        "rootLevelApi.json"
    ],
    "ignoreQueryStringParameter": {
        "/mockapi/featureRootLevelApi.php": {
            "id": ""
        }
    }
}
module.exports = MOCK_API_CONFIGS;
