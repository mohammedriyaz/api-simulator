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
        "get_user.json",
        "callback.json",
        "token.json",
        "get_standby_details.json",
        "force_remove.json"
    ],
    //add the api path and the query string parameters those needs to be ignored
    // ex. your mockdata for "/backend/pool_entitlement_summaries/search_by_pool.json" needs to be listed based on license_pool_id, but not based on logical_account_id and offset.
    // you need to set the config like first object of ignoreQueryStringParameter.
    //
    // If the mockserver get the request with following url, it will simply ignore logical_account_id & offset values, but it will consider license_pool_id, because we didn't set
    //  config for that. so it will match the object like below from the mock data
    // /backend/pool_entitlement_summaries/search_by_pool.json?logical_account_id=1&license_pool_id=2&offset=0
    //
    //   {
    //     "entitlement_tag_id": 6396,
    //     "id": 3,
    //     "is_active": true,
    //     "license_pool_id": 2
    //   }, ...

    "ignoreQueryStringParameter": {
        "/backend/satellites.json": {
            "logical_account_id": ""
        },
        "/backend/product_instances/search_by_pool.json": {
            "logical_account_id": "",
            "offset": ""
        },
        "/backend/product_instances/get_standby_details.json": {
            "product_instance_identifier": ""
        },
        "/backend/pool_entitlement_summaries/search_by_pool.json": {
            "logical_account_id": "",
            "offset": ""
        },
        "/backend/pool_entitlements.json": {
            "logical_account_id": ""
        },
        "/backend/prod_inst_entitlement_summaries/search.json":{
            "license_pool_id": "",
             "entitlement_tag_id": ""
        },
        "/backend/notifications": {
            "ref_id": "",
            "ref_type": "",
            "pool_id": "",
            "logical_account_id": "",
            "limit": ""
        }

    }
}
//export default MOCK_API_CONFIGS;
module.exports = MOCK_API_CONFIGS;
