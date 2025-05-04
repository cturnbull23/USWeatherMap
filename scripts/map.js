var map;

function init() {
    
    // create map and set center and zoom level
    var map = L.map('mapid', {
        center: [38,-96],
        minZoom: 5,
        maxZoom: 10,
        zoom: 5
    });
    
    // ESRI World Street tiles
    var worldStreetMapESRI = L.tileLayer('http://services.arcgisonline.com/arcgis/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        format: 'image/png',
        transparent: true
    });
    
    // Iowa Mesonet WMS - Channel 2 Visible Satellite (GOES-19)
    var satelliteCh02 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch02',
        format: 'image/png',
        transparent: true
    }).addTo(map);
    
    var satelliteCh07 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch07',
        format: 'image/png',
        transparent: true
   });

    // NWS Alerts
    // Currently does not show countywide alerts
    var nwsAlertsAPI = 'https://api.weather.gov/alerts/active';
    $.getJSON(nwsAlertsAPI, function(data) {
        L.geoJSON(data, {
            style: function(feature) {
                var alertColor = 'orange';
                if (feature.properties.severe === 'Severe') alertColor = 'red';
                return {color: alertColor}
            },
            // Popup for each feature. Alert name and headline
            onEachFeature: function(feature,layer) {
                var props = feature.properties;
                layer.bindPopup(`<strong>${props.event}</strong><br>${props.headline}`);
            }
        }).addTo(map);
    });

    // Storm Prediction Center Day 1 Categorical Outlook
    var spcCategorical = L.tileLayer.wms('http://localhost:8080/geoserver/GEOG585/wms', {
        layers: 'GEOG585:SPCDay1Outlook',
        format: 'image/png',
        styles: 'spcCategoricalOutlook',
        transparent: true
    });

    // Nexrad radar from Iowa State Mesonet
    var nwsRadar = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r',
        format: 'image/png',
        transparent: true
   }).addTo(map);
    
    // United States basemap from AWS S3    
    var usBasemap = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/USBasemap3/{z}/{x}/{y}.png'); 
    
    function usStatesStyle(feature) {
        return {
            color: "#1f78b4",
            weight: 3.25,
            fill: false
        };
    }

    function usCountiesStyle(feature) {
        return {
            color: "#232323",
            weight: 0.98,
            fill: false
        };
    }
    
    var usCounties = new L.geoJSON(usCountiesJson, {
        style: usCountiesStyle
    }).addTo(map);

    var usStates = new L.geoJSON(usStatesJson, {
        style: usStatesStyle
    }).addTo(map);

    var townCityLabels = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/townscitieslabels/{z}/{x}/{y}.png').addTo(map);

    // variables for airports features for selection
    var airportsLayer;
    var selection;
    var selectedLayer;
    
    // create icons for airports (selected and unselected)
    var airportsIcon = L.icon({
        iconUrl: '/images/airport.svg',
        iconSize: [20,20]
    });
    
    // handle click events on airport features
    function airportsOnEachFeature(feature, layer) {
        layer.on({
            click: function(e) {
                if (selection) {
                    resetStyles();
                }
                
                e.target.setIcon(selectedAirportsIcon);
                selection = e.target;
                selectedLayer = airportsLayer;
                
                // Insert some HTML with the feature name
                buildSummaryLabel(feature);
                
                L.DomEvent.stopPropagation(e); // stop click event from being propogated further
            }
        });
    }
    
    // add the airports GeoJSON layer using the airportsData variable from us_airports.js
    airportsLayer = new L.geoJSON(airportsData, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {icon: airportsIcon});
        },
        onEachFeature: airportsOnEachFeature
    }).addTo(map);
    
    var selectedAirportsIcon = L.icon({
        iconUrl: '/images/airport_selected.svg',
        iconSize: [40,40]
    });
    
    // define basemap and thematic layers and add layer switcher control
    var basemaps = {
        "GOES-19 Channel 2: Visible (red)": satelliteCh02,
        "GOES-19 Channel 7: Shortwave IR": satelliteCh07
    };
    
    var overlays = {
        "Custom Basemap": usBasemap,
        "ESRI World Street Map": worldStreetMapESRI,
        "US Counties": usCounties,
        "US States": usStates,
        "SPC Day 1 Convective Outlook": spcCategorical,
        "Airports": airportsLayer,
        "NWS Radar": nwsRadar,
        "NWS Alerts": nwsAlerts,
        "Places": townCityLabels
    };
    
    L.control.layers(basemaps,overlays).addTo(map);
    
    // handle clicks on the map that don't hit a feature
    map.addEventListener('click', function(e) {
        if (selection) {
            resetStyles();
            selection = null; 
            document.getElementById('summaryLabel').innerHTML = '<p>Click an airport on the map to get more information.</p>';
        }
    });
    
    // function to set the old selected feature back to its original symbol. Used when the map or a feature is clicked.
    function resetStyles() {
        selection.setIcon(airportsIcon);
    }
    
    // function to build the HTML summary for the summary label using the selected feature's "name" property
    function buildSummaryLabel(currentFeature) {
        var featureName = currentFeature.properties.name_en || "Unnamed feature";
        var ident = currentFeature.properties.gps_code;
        var wiki = currentFeature.properties.wikipedia;
        var type = currentFeature.properties.type;
        var keys = Object.keys(currentFeature);
        type = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById('summaryLabel').innerHTML = '<table cellpadding:"0" cellspacing:"0"><tr><th>Name</th><th>Identification</th><th>Type</th><th>Wikipedia</th></tr><tr><td>'+featureName+'</td><td>'+ident+'</td><td>'+type+'</td><td><a href="' + wiki +'" target="_blank">'+wiki+'</a></td></tr></table>';
    }

    // add a scale to the map
    L.control.scale().addTo(map);

    // define event handler function for click events and register it
    function Identify(e)
    {
        // set parameters needed for GetFeatureInfo WMS request
        var sw = map.options.crs.project(map.getBounds().getSouthWest());
        var ne = map.options.crs.project(map.getBounds().getNorthEast());
        var BBOX = sw.x + "," + sw.y + "," + ne.x + "," + ne.y;
        var WIDTH = map.getSize().x;
        var HEIGHT = map.getSize().y;

        var X = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).x);
        var Y = Math.trunc(map.layerPointToContainerPoint(e.layerPoint).y);

        // compose the URL for the request for the NWS Alerts
        var URL = 'http://localhost:8080/geoserver/GEOG585/wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&Layers=GEOG585:NWSAlerts&QUERY_LAYERS=GEOG585:NWSAlerts&BBOX='+BBOX+'&FEATURE_COUNT=1&HEIGHT='+HEIGHT+'&WIDTH='+WIDTH+'&INFO_FORMAT=application%2Fjson&TILED=false&CRS=EPSG%3A3857&I='+X+'&J='+Y;

        //send GetFeatureInfo as asynchronous HTTP request using jQuery $.ajax
        $.ajax({
            url: URL,
            dataType: "json",
            type: "GET",
            success: function(data)
            {
                if(data.features.length !== 0) {  // at least one feature returned in response
                    var returnedFeature = data.features[0]; // first feature from response
                    var alertName = returnedFeature.properties.PROD_TYPE;
                    var alertStart = returnedFeature.properties.ONSET;
                    var alertEnd = returnedFeature.properties.EXPIRATION;

                   // Set up popup for clicked feature and open it
                   var popup = new L.Popup({
                     maxWidth: 300
                   });

                   popup.setContent("<b>" + alertName + "</b><br />" + "Valid: " + alertStart + "<br> Expires: " + alertEnd);
                   popup.setLatLng(e.latlng);
                   map.openPopup(popup);                            
                }
            }
        });
    }
    map.addEventListener('click', Identify);
}
