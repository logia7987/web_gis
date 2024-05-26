function drawNodePoint(data) {
    return new Promise(function (resolve, reject) {
        const sourceId = "data_" + data.fileName;
        const layerId = "nodes_" + data.fileName;

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
                'type': 'circle',
                'source': sourceId,
                'paint': {
                    'circle-radius': 6,
                    'circle-color': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        '#007dd2',
                        '#1aa3ff'
                    ],
                    'circle-opacity': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        1,
                        1
                    ]
                },
                'filter': ['>', ['zoom'], 13]
            });

            // 링크를 클릭했을 때의 이벤트 핸들러
            map.on('click', layerId, function (e) {
                handleFeatureSelection(e);
            });

            resolve();
        } catch (error) {
            reject(error);
        }


    });
}

function getNodeDetail() {
    if (map.getLayer('nodes_' + fileNm) !== undefined) {
        // 현재 선택된 노드 표시
        map.on('click', function (e) {
            // 클릭한 위치에서 가장 가까운 노드 찾기
            var features = map.queryRenderedFeatures(e.point, { layers: ['nodes_' + fileNm] });

            if (features.length > 0) {
                // 가장 가까운 노드에 대한 작업 수행
                handleFeatureSelection(features[0]);
            }
        });
    }
}