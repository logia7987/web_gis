function drawLinkLine(data) {
    let count = 0;
    for (const key in dataArr) {
        if (key.indexOf(data.fileName) > -1) {count++;}
    }
    if (count > 0 ) {
        data.fileName = data.fileName+'_'+count
    }

    dataArr[data.fileName] = data
    newProperty[data.fileName] = data.data.features[0].properties

    var tData = {
        type: 'geojson',
        data: {
            type : 'FeatureCollection',
            features :data.data.features
        }
    }

    map.addSource("lineData_"+data.fileName, tData);
    map.addLayer({
        'id': 'lines_' + data.fileName,
        'type': 'line',
        'source': 'lineData_' + data.fileName, // 선의 데이터를 가리키는 소스
        'paint': {
            'line-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#007dd2', // 클릭한 선의 색상
                '#1aa3ff', // 클릭하지 않은 선의 색상
            ],
            'line-width': 2, // 선의 너비 설정
            'line-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ]
        }
    });
}