function drawNodePoint(data) {
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

    map.addSource("nodeData_"+data.fileName, tData);
    map.addLayer({
        'id': 'points_'+data.fileName,
        'type': 'circle',
        'source': 'nodeData_'+data.fileName,
        'paint': {
            'circle-radius': 6, // 점의 반지름 설정
            'circle-color': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                '#007dd2', // 클릭한 점의 색상
                '#1aa3ff', // 클릭하지 않은 점의 색상
            ],
            'circle-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                1
            ]
        }
    });
}

function getNodeDetail() {
    $('.mapboxgl-ctrl-group').show()
    $('.mapboxgl-gl-draw_line,.mapboxgl-gl-draw_point,.mapboxgl-gl-draw_combine,.mapboxgl-gl-draw_uncombine').hide()

    getProperties()

    if (map.getLayer('nodes_'+fileNm) !== undefined) {
        for (i = 0; i < fileNmList.length; i++) {
            map.on('mousemove', 'nodes_'+ fileNmList[i], function () {})
            map.on('mouseleave', 'nodes_'+ fileNmList[i], function () {})
            map.on('click', 'nodes_'+ fileNmList[i], function () {})
            map.setPaintProperty('nodes_'+fileNmList[i],'fill-opacity', 0.5);
        }
        var opacity = ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.5]
        map.setPaintProperty('nodes_'+fileNm,'fill-opacity', opacity);
        map.on('click', 'nodes_'+fileNm, function (e) {
            selectedShp = e.features[0]
            if (e.features[0].layer.id === 'nodes_'+fileNm) {
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

        // map.on('mousemove', 'nodes_'+fileNm, (e) => {
        //     selectedShp = e.features
        // });
        // map.on('mouseleave', 'nodes_'+fileNm, () => {
        //
        // });
    }
}