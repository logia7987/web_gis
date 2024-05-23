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

        dataArr[data.fileName] = data;
        newProperty[data.fileName] = data.data.features[0].properties;

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

function getLinkDetail() {
    $('.mapboxgl-ctrl-group').show()
    $('.mapboxgl-gl-draw_line,.mapboxgl-gl-draw_point,.mapboxgl-gl-draw_combine,.mapboxgl-gl-draw_uncombine').hide()

    if (map.getLayer('links_'+fileNm) !== undefined) {
        for (i = 0; i < fileNmList.length; i++) {
            map.on('mousemove', 'links_'+ fileNmList[i], function () {})
            map.on('mouseleave', 'links_'+ fileNmList[i], function () {})
            map.on('click', 'links_'+ fileNmList[i], function () {})
            map.setPaintProperty('links_'+fileNmList[i],'fill-opacity', 0.5);
        }
        var opacity = ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.5]
        map.setPaintProperty('links_'+fileNm,'fill-opacity', opacity);
        map.on('click', 'links_'+fileNm, function (e) {
            selectedShp = e.features[0]
            if (e.features[0].layer.id === 'links_'+fileNm) {
                var property = "";
                var id = selectedShp.properties.DIST1_ID;
                var info = dataArr[fileNm].data.features
                for (i = 0; i < info.length; i++) {
                    if (info[i].properties.DIST1_ID === id) {
                        property = info[i]
                    }
                }
                $('#'+ id).parent().addClass("selected")

                editShp(property)
            }
        });
    }
}