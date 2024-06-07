function drawPolyline(data) {
    return new Promise(function (resolve, reject) {
        const sourceId = "data_" + data.fileName;
        const layerId = "polygons_" + data.fileName;

        checkHasSource(sourceId, layerId)

        dataArr[data.fileName] = data;
        if (newProperty[data.fileName] == undefined) {
            newProperty[data.fileName] = data.data.features[0].properties;
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
                'type': 'fill',
                'source': sourceId,
                'paint': {
                    'fill-color': polygonColor,
                    'fill-opacity': 0.5
                }
            });

            map.addLayer({
                'id': 'outline_'+data.fileName,
                'type': 'line',
                'source': sourceId,
                'layout': {},
                'paint': {
                    'line-color': polylineColor,
                    'line-width': Number(polylineWidth)
                }
            });

            map.on('click', layerId, function (e) {
                handleFeatureSelection(e);
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}
function polygonDetail() {
    // $('.mapboxgl-gl-draw_line,.mapboxgl-gl-draw_point,.mapboxgl-gl-draw_combine,.mapboxgl-gl-draw_uncombine').hide()
    if (map.getLayer('polygons_'+fileNm) !== undefined) {
        $(".colors-item .sp-preview-inner").css("background-color", map.getPaintProperty('polygons_'+fileNm,'fill-color'))
        $(".line-item .sp-preview-inner ").css("background-color", map.getPaintProperty('outline_'+fileNm,'line-color'))
        $("#line-width").val(map.getPaintProperty('outline_'+fileNm,'line-width'))
    }

    if (map.getLayer('polygons_'+fileNm) !== undefined) {

        for (i = 0; i < fileNmList.length; i++) {
            map.on('mousemove', 'polygons_'+ fileNmList[i], function () {})
            map.on('mouseleave', 'polygons_'+ fileNmList[i], function () {})
            map.on('click', 'polygons_'+ fileNmList[i], function () {})
            map.setPaintProperty('polygons_'+fileNmList[i],'fill-opacity', 0.5);
        }

        if (features.length > 0) {
            // 가장 가까운 링크에 대한 작업 수행
            handleFeatureSelection(features[0]);
        }

    }
}

function updatePolygonData(features, properties, maxId) {
    let newFeature;
    var obj = Object.keys(newProperty[fileNm])
    for (j = 0; j < features.length; j++) {
        if (features[j].properties[obj[0]] === undefined) {
            draw.delete(features[j].id)
            newFeature = {
                id: String(maxId + 1),
                type: 'Feature',
                properties: properties,
                geometry: {
                    coordinates: [features[j].geometry.coordinates],
                    type : "MultiPolygon"
                },
            };
        }
    }
    if (map.getSource('data_'+fileNm) === undefined) {
        const tData = {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: [
                    newFeature
                ]
            }
        }

        map.addSource("data_"+fileNm, tData);
        map.addLayer({
            'id': 'polygons_'+fileNm,
            'type': 'fill',
            'source': 'data_'+fileNm,
            'layout': {},
            'paint': {
                'fill-color': polygonColor,
                'fill-opacity': 0.5
            }
        });
        map.addLayer({
            'id': 'outline_'+fileNm,
            'type': 'line',
            'source': 'data_'+fileNm,
            'layout': {},
            'paint': {
                'line-color': lineColor,
                'line-width': Number(lineWidth),
            }
        });
    } else {
        updateSourceData(newFeature);
    }
}