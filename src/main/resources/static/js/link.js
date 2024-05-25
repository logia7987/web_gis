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
                    'line-width': [
                        'case',
                        ['boolean', ['feature-state', 'hover'], false],
                        4,
                        2
                    ]
                },
                'filter': ['>', ['zoom'], 13]
            });

            // 링크를 클릭했을 때의 이벤트 핸들러
            map.on('click', layerId, function (e) {
                handleLinkSelection(e.features[0]);
            });

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function getLinkDetail() {
    if (map.getLayer('links_' + fileNm) !== undefined) {
        // 현재 선택된 링크 표시
        map.on('click', function (e) {
            // 클릭한 위치에서 가장 가까운 링크 찾기
            var features = map.queryRenderedFeatures(e.point, { layers: ['links_' + fileNm] });

            if (features.length > 0) {
                // 가장 가까운 링크에 대한 작업 수행
                handleFeatureSelection(features[0]);
            }
        });
    }
}

// 링크 속성 찾기
function findProperty(id) {
    const info = dataArr[fileNm].data.features;
    for (let i = 0; i < info.length; i++) {
        if (Number(info[i].id) === id) {
            return info[i];
        }
    }
    return null;
}