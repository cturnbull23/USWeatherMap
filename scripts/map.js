var map;

function init() {
    
    // Create map and set center and zoom levels
    map = L.map('mapid', {
        center: [38,-96],
        minZoom: 5,
        maxZoom: 10,
        zoom: 5
    });
    
    // Iowa Mesonet WMS - Channel 2 Visible Satellite (GOES-19)
    var satelliteCh02 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch02',
        format: 'image/png',
        transparent: true
    }).addTo(map);
    
    // Iowa Mesonet WMS - Channel 7 Shortwave Infrared Satellite (GOES-19)
    var satelliteCh07 = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/goes_east.cgi', {
        layers: 'conus_ch07',
        format: 'image/png',
        transparent: true
   });

    // Define basemaps, create empty overlays variable, create layer switcher control variable
    var basemaps = {
        "GOES-19 Channel 2: Visible (red)": satelliteCh02,
        "GOES-19 Channel 7: Shortwave IR": satelliteCh07
    };

    var overlays = {};
    var layerControl = L.control.layers(basemaps,overlays).addTo(map);

    // Create function to get NWS Alerts asynchronously...
    // Countywide alerts are not displaying (geometry issue?)
    var nwsAlertsAPI = 'https://api.weather.gov/alerts/active';
    var nwsAlerts;

    function getNWSAlerts() {
        $.getJSON(nwsAlertsAPI, function(data) {

            // Remove any existing layer
            if (nwsAlerts) {
                map.removeLayer(nwsAlerts);
                layerControl.removeLayer(nwsAlerts);
            }

            nwsAlerts =  L.geoJSON(data, {
                style: function(feature) {
                    var alertColor = 'purple';
                    var alertWeight = 1;
                    switch (feature.properties.event) {
                        case 'Severe Thunderstorm Warning': return {color: "#FFA500", weight: 3};
                        case 'Tornado Warning': return {color: "#FF0000", weight: 3};
                        case 'Extreme Wind Warning': return {color: "#FF8C00", weight: 3};
                        case 'Special Marine Warning': return  {color: "#FFA500", weight: 2};
                        case 'Flash Flood Warning': return {color: "#8B0000", weight: 2};
                        case 'Flood Warning': return {color: "#00FF00"};
                        case 'Flood Advisory': return {color: "#00FF7F"};
                        case 'Snow Squall Warning': return {color: "#C71585"};
                        case 'Dust Storm Warning': return {color: "#FFE4C4"};
                        case 'Dust Advisory': return {color: "#BDB76B"};
                        case 'Marine Weather Statement': return {color: "#FFDAB9"};
                        case 'Special Weather Statement': return {color: "#FFE4B5"};
                    }
                    return {color: alertColor, weight: alertWeight};
                },
                // Popup for each feature. Alert name and headline
                onEachFeature: function(feature,layer) {
                    var props = feature.properties;
                    layer.bindPopup(`<strong>${props.event}</strong><br>${props.headline}`);
                }
            }).addTo(map);
            layerControl.addOverlay(nwsAlerts, "NWS Alerts");
        });
    }

    // Call the function to get the NWS Alerts
    getNWSAlerts();

    // Get new data every 5 minutes (300,000 ms)
    setInterval(getNWSAlerts, 300000);

    // Create function to asynchronously get SPC Day 1 Categorical Outlook
    var spcCategorical;

    function getSPCOutlook() {
        // Remove any existing layer
        if (spcCategorical) {
            map.removeLayer(spcCategorical);
            layerControl.removeLayer(spcCategorical);
        }

        spcCategorical = L.esri.featureLayer({
            url: 'https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/FeatureServer/1',
            style: function(feature) {
                var outlookColor = 'gray'; // if unknown
                switch (feature.properties.dn) {
                    case 2: return {color: "#c0e8c0"};
                    case 3:  return {color: "#7fc57f"};
                    case 4: return {color: "#f6f67f"};
                    case 5: return {color: "#e6c27f"};
                    case 6: return {color: "#e67f7f"};
                    case 8: return {color: "#ff7fff"};
                }
                return {color: outlookColor};
            },
            // Popup information... custom because the dataset only uses a number not the risk name
            onEachFeature: function(feature,layer) {
                var content = '';
                switch (feature.properties.dn) {
                    case 2:
                        content = '<strong>General Thunderstorm Risk</strong>';
                        break;
                    case 3:
                        content = '<strong>Marginal Risk</strong>';
                        break;
                    case 4:
                        content = '<strong>Slight Risk</strong>';
                        break;
                    case 5:
                        content = '<strong>Enhanced Risk</strong>';
                        break;
                    case 6:
                        content = '<strong>Moderate Risk</strong>';
                        break;
                    case 8:
                        content = '<strong>High Risk</strong>';
                }
                layer.bindPopup(`Risk Level: ${content}`);
            }
        });
        layerControl.addOverlay(spcCategorical, "SPC Day 1 Categorical Outlook");
    }

    // Call the function to get the SPC Outlook
    getSPCOutlook();

    // Get new data every hour (3,600,000 ms)
    setInterval(getSPCOutlook, 3600000);
    
    // Nexrad radar from Iowa State Mesonet
    var nwsRadar = L.tileLayer.wms('https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi', {
        layers: 'nexrad-n0r',
        format: 'image/png',
        transparent: true
    }).addTo(map);
    layerControl.addOverlay(nwsRadar, "National Weather Service Radar");
    
    // United States basemap from AWS S3    
    //var usBasemap = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/USBasemap3/{z}/{x}/{y}.png'); 
    //layerControl.addOverlay(usBasemap, "Custom US Basemap");

    // Styles for the US States and US Counties geoJSON
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

    // US Counties geoJSON
    var usCounties = new L.geoJSON(usCountiesJson, {
        style: usCountiesStyle
    }).addTo(map);
    layerControl.addOverlay(usCounties, "US Counties");

    // US States geoJSON
    var usStates = new L.geoJSON(usStatesJson, {
        style: usStatesStyle
    }).addTo(map);
    layerControl.addOverlay(usStates, "US States");

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
    layerControl.addOverlay(airportsLayer, "US Airports");
    
    var selectedAirportsIcon = L.icon({
        iconUrl: '/images/airport_selected.svg',
        iconSize: [40,40]
    });
    
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

    // Labels for towns and cities
    var townCityLabels = L.tileLayer('https://geog585-a29bg72.s3.us-east-2.amazonaws.com/townscitieslabels/{z}/{x}/{y}.png').addTo(map);
    layerControl.addOverlay(townCityLabels, "Place Names");

    // add a scale to the map
    L.control.scale().addTo(map);
}
