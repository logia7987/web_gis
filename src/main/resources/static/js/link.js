function drawLinkLine(data) {
    return new Promise(function (resolve, reject) {
        const sourceId = "data_" + data.fileName;
        const layerId = "links_" + data.fileName;

        if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
        }
        if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
        }

        var tData = {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: data.data.features
            }
        };

        try {
            map.addSource(sourceId, tData);
            map.addLayer({
                'id': layerId,
                'type': 'line',
                'source': sourceId,
                'paint': {
                    'line-color': '#007dd2',
                    'line-width': 2
                }
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}