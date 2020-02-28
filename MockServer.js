/**
 * Created by mmohamm4 on 07/20/2018.
 */
const jsonServer = require('json-server'),
    fs = require('fs'),
    pathAPI = require('path'),
    https = require('https'),
    glob = require("glob"),
    argv = require('yargs')
        .usage('Usage: $0 --config <config_file_path>')
        .example('$0 --config ./apisimulator.config.js', 'Start the api-simulator using given config options')
        .alias('c', 'config')
        .help('h')
        .alias('h', 'help')
        .argv;
let mockAPIConfigs;

try {
    console.log(pathAPI.resolve(argv.config));
    mockAPIConfigs = require(argv.config ? pathAPI.resolve(argv.config) : "./samples/apisimulator.config");
    mockAPIConfigs.defaultMockDataPath = mockAPIConfigs.defaultMockDataPath || pathAPI.resolve(__dirname, "./samples/default-mock-dataset");
    mockAPIConfigs.featureMockDataPath = mockAPIConfigs.featureMockDataPath || pathAPI.resolve(__dirname, "./samples/feature-mock-datasets");
} catch (e) {
    mockAPIConfigs = {};
}

const db = {},
    defaultMockDataSetPath = pathAPI.isAbsolute(mockAPIConfigs.defaultMockDataPath) ? mockAPIConfigs.defaultMockDataPath : pathAPI.resolve(__dirname, mockAPIConfigs.defaultMockDataPath);
    featureDataSetPath = pathAPI.isAbsolute(mockAPIConfigs.featureMockDataPath) ? mockAPIConfigs.featureMockDataPath : pathAPI.resolve(__dirname, mockAPIConfigs.featureMockDataPath),
    baseUrlPath = mockAPIConfigs.baseUrlPath || "/backend",
    mockDataRootDir = pathAPI.basename(defaultMockDataSetPath),
    featureMockDataRootDir = pathAPI.basename(featureDataSetPath);
let featureMocksPaths=[], matches=[];

console.log("resolved or given default mock data set path: " + defaultMockDataSetPath);
console.log("resolved or given feature mock data sets path: " + featureDataSetPath);
var getDirectories = function (src, callback) {
    glob(src + '/**/*.json', callback);
};
getDirectories(featureDataSetPath/*__dirname + '/FeatureMockJsons'*/, function (err, res) {//collect all feature based mock paths
    if (err) {
        console.log('Error', err);
    } else {
        featureMocksPaths = [...res];
    }
    getDirectories(defaultMockDataSetPath/*__dirname + '/MockJsons'*/, function (err, res) {//after collecting feature based mockpath,
                                                                        // will collect default mock paths
        if (err) {
            console.log('Error', err);
        } else {
            var server = jsonServer.create();//Json Mock server app
            var middlewares = jsonServer.defaults(),
                flatNestedPath = [];
            server.use(middlewares);
            let routesWithoutJsonExt = (mockAPIConfigs.ignoreJsonExtension && Array.isArray(mockAPIConfigs.ignoreJsonExtension) && mockAPIConfigs.ignoreJsonExtension) || [],
                completedPath = [],
                featureList = (mockAPIConfigs.useTheseFeatureMocks && Array.isArray(mockAPIConfigs.useTheseFeatureMocks) && mockAPIConfigs.useTheseFeatureMocks) || [];

            server.use(jsonServer.bodyParser);
            server.use(function (req, res, next) {
                if (req.method === 'POST' || req.method === 'PUT') {//typical restful service will add/update data through POST/PUT method,
                    // jsonserver also follow the same, so we internally change the methode
                    // to GET to fetch the router data back
                    // Converts POST to GET and move payload to query params
                    // This way it will make JSON Server that it's GET request
                    req.method = 'GET';
                    req.query = req.body;
                } else if (req.method === "GET") {

                    let ignoreQueryString = [],
                        QrSpecs = {};
                    (mockAPIConfigs.ignoreQueryStringParameter &&
                        typeof mockAPIConfigs.ignoreQueryStringParameter === "object" &&
                        (ignoreQueryString = Object.keys(mockAPIConfigs.ignoreQueryStringParameter),
                            QrSpecs = mockAPIConfigs.ignoreQueryStringParameter)
                    );
                    if (req.url.indexOf("?")>=0) {
                        let pathStr = req.url.split("?").shift();
                        if (ignoreQueryString.indexOf(pathStr)>=0) {
                            let foundQrSpecs = QrSpecs[pathStr] || false;
                            for (let qr in req.query) {
                                if (req.query.hasOwnProperty(qr)) {
                                    if (foundQrSpecs) {
                                        if (foundQrSpecs.hasOwnProperty(qr) && foundQrSpecs[qr] === "") {
                                            delete req.query[qr];
                                        } else if (foundQrSpecs[qr]) {
                                            req.query[qr] = foundQrSpecs[qr];
                                        }
                                    } else {
                                        delete req.query[qr];
                                    }
                                }
                            }
                        }
                    }
                }
                // Continue to JSON Server router
                next()
            })

            /**
             * check any feature specific mock data configured through config file.
             * if feature list configured in mockApi.config->useTheseFeatureMocks,
             * the default mock data will be overwritten by first matched feature specific mock data.
             * this function will find that feature specific mock data path and remove that from featureMockPaths array to process the unmatched feature paths
             */
            function fetchAndRemoveFeatureSpecificMock(defaultMockPath) {
                for (let i=0, len=featureList.length; i<len; i++) {
                    let featurePathInd = featureMocksPaths.indexOf(defaultMockPath.replace(mockDataRootDir, featureMockDataRootDir + '/' + featureList[i]));
                    if (featurePathInd>=0) {
                        return featureMocksPaths.splice(featurePathInd, 1)[0];
                    }
                }
                return "";
            }

            /**
             * function to take care of endpoints without .json extension based on config variable "routesWithoutJsonExt"
             * @param routeLeaf => filename from the detected json path
             * @returns string => endpoint path based on config variable "routesWithoutJsonExt"
             */
            function validateAndRepJsonExt(routeLeaf) {
                if (routesWithoutJsonExt.indexOf(routeLeaf) >= 0) {
                    return routeLeaf.replace(".json", "");
                }
                return mockAPIConfigs.apiEndpointExtension ? routeLeaf.replace(".json", mockAPIConfigs.apiEndpointExtension) : routeLeaf;
            }

            function checkNextIsSameSibling(nextPath, currentPathParent) {
                let pathArr = nextPath.split("/"),
                    lastCompletedPath = (completedPath.length && completedPath[completedPath.length - 1]) || "";
                pathArr.pop();
                return ((nextPath && pathArr.join("/") === currentPathParent) || (lastCompletedPath && lastCompletedPath === currentPathParent));
            }

            /**
             * extract parent path of given .json file path
             * @param string path
             * @param boolean forFeature -> flag to process default/feature mock path
             * @returns string => parent path
             */
            let parseParentPath = (path, forFeature=false) => {
                if (path) {
                    let pat = new RegExp('\\/' + ((forFeature && featureMockDataRootDir + '\/(' + featureList.join("|") + ')') || mockDataRootDir) + '([\\w\\/\\-]+\\/)\\w+\\.json', "i"),
                        pathMatches = path.match(pat),//path.match(/\/MockJsons([\w\/\-]+\/)\w+\.json/i),
                        parPath = "";
                    if (pathMatches && pathMatches.length >= 2) {
                        parPath = pathMatches[forFeature ? 2 : 1];
                    }
                    return parPath;
                }
                return path;
            };
            //function to extract all nested paths
            // return obj format would be
            // {"path_val_from_<MockApi>": [array_of_files_from_same_parent]}
            // {
            //  "/alerts/": [
            //      '/Users/mmohamm4/workspace/atlantis-ui/MockApi/MockJsons/alerts/alerts_details.json',
            //      '/Users/mmohamm4/workspace/atlantis-ui/MockApi/MockJsons/alerts/total_alerts_count.json'
            //  ]
            // }
            let extractNestedPaths = (forFeature=false) => {
                let newPathArr = {},
                    extractedPathPositions = [],
                    parentPath,
                    paths = forFeature ? [...featureMocksPaths] : [...res];
                for (let i=paths.length-1; i >= 0; i--) {
                    parentPath = parseParentPath(paths[i], forFeature);
                    for (let j=paths.length-1; j>=0; j--) {
                        if (i !== j) {
                            let parPath = parseParentPath(paths[j], forFeature);
                            if (parPath && parentPath && parPath!=="/" && parentPath!=="/" && parPath === parentPath) {
                                if (!newPathArr[parentPath]) newPathArr[parentPath] = [];
                                newPathArr[parentPath].push(paths[i]);
                                newPathArr[parentPath].push(paths[j]);
                                if (extractedPathPositions.indexOf(i) < 0) {
                                    extractedPathPositions.push(i);
                                }
                                extractedPathPositions.push(j);
                            }
                        }
                    }
                    if (extractedPathPositions.length) {
                        extractedPathPositions.forEach(pathPos => {
                            if (paths[pathPos]) {
                                paths.splice(pathPos,1);
                            }
                        });
                        extractedPathPositions.splice(0);
                    }
                    let len = paths.length-1;
                    if (i > len) {
                        i = len;
                    }
                }

                if (forFeature) {
                    featureMocksPaths.splice(0);
                    featureMocksPaths = [...paths];
                } else {
                    res.splice(0);
                    res = [...paths];
                }

                return newPathArr;
            };

            updateDBRoutesFromMockFiles = (paths, isNested=false, forFeature=false) => {
                if (isNested) {
                    //process all nested paths
                    for (let nPath in paths) {
                        if (paths.hasOwnProperty(nPath)) {
                            let nestDataObj = {};
                            paths[nPath].map(path=> {
                                let filename = path.replace(/^.*[\/]/, ''),
                                    featurePath = (!forFeature && fetchAndRemoveFeatureSpecificMock(path)) || "";
                                nestDataObj[validateAndRepJsonExt(filename)] = require(featurePath || path);
                            });
                            flatNestedPath = flatNestedPath.concat(paths[nPath]);//creating flat nested paths to
                            // avoid processing again during unique paths
                            server.use(baseUrlPath + nPath.substring(0,nPath.length-1), jsonServer.router(Object.assign({}, nestDataObj)));
                            delete nestDataObj;
                        }
                    }
                } else {
                    //Process all other path that excluded the files in the same level
                    let pat = new RegExp('\\/' + ((forFeature && featureMockDataRootDir + '\\/(' + featureList.join("|") + ')\\/') || mockDataRootDir + "\\/") + '([\\w\\/]+.\\w+)', "i");
                    for (let len=paths.length, i=len-1; i>=0; i--){
                        let val = paths[i],
                            featurePath = (!forFeature && fetchAndRemoveFeatureSpecificMock(val)) || "";
                        Array.isArray(matches) && matches.splice(0);
                        //matches = val.match(/\/MockJsons\/([\w\/]+.\w+)/i);
                        matches = val.match(pat);
                        if (Array.isArray(matches) && matches.length >= 2) {//handle
                            let paths = matches[forFeature ? 2 : 1].split("/"),
                                pathsObj = {}, routePath;
                            if (paths.length > 1) {
                                let leaf = paths.pop(),
                                    routeObj = {};
                                routePath = baseUrlPath + paths.join("/");
                                if (flatNestedPath.indexOf(val)<0) {
                                    routeObj[validateAndRepJsonExt(leaf)] = require(featurePath||val);
                                }

                                server.use(routePath, jsonServer.router(Object.assign({}, routeObj)));

                            } else {
                                db[validateAndRepJsonExt(paths[0])] = require(featurePath||val);
                            }

                            delete pathsObj;
                            delete routeObj;

                        }
                    }
                }
            }

            updateDBRoutesFromMockFiles(extractNestedPaths(), true);
            updateDBRoutesFromMockFiles([...res]);

            if (featureList.length) {
                updateDBRoutesFromMockFiles(extractNestedPaths(true), true, true);
            }
            if (featureList.length) {
                updateDBRoutesFromMockFiles([...featureMocksPaths], false, true);
            }

            server.use(baseUrlPath, jsonServer.router(db));//registering mock rountes

            var options = {//for https
                key: fs.readFileSync((mockAPIConfigs.sslCertFiles && mockAPIConfigs.sslCertFiles.key) || pathAPI.resolve(__dirname, './samples/key.pem')),
                cert: fs.readFileSync((mockAPIConfigs.sslCertFiles && mockAPIConfigs.sslCertFiles.cert) || pathAPI.resolve(__dirname, './samples/cert.pem'))
            };
            https.createServer(options, server).listen(3030, function() {
                console.log("api-simulator started on port " + 3030);
            }).on('error', (e) => { //to suppress exception popup from electron app while open one more app instance
                if (e.code === 'EADDRINUSE') {
                    console.error('port 3030 already in use');
                }
            });;
        }
    });
});
