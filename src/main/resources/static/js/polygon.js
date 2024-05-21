function polygon(data) {
    var tData = {
        type: 'geojson',
        data: {
            type : 'FeatureCollection',
            features : data
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
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ]
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
}

function drawPolyline(data) {
    let count = 0;
    for (const key in dataArr) {
        if (key.indexOf(data.fileName) > -1) {count++;}
    }
    if (count > 1 ) {
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

    setMapBounds(data.data);
    map.addSource("data_"+data.fileName, tData);
    map.addLayer({
        'id': 'polygons_'+data.fileName,
        'type': 'fill',
        'source': 'data_'+data.fileName,
        'paint': {
            'fill-color': polygonColor,
            'fill-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                0.5
            ]
        }
    });

    map.addLayer({
        'id': 'outline_'+data.fileName,
        'type': 'line',
        'source': 'data_'+data.fileName,
        'layout': {},
        'paint': {
            'line-color': lineColor,
            'line-width': Number(lineWidth)
        }
    });

}

function polygonDetail() {
    $('.mapboxgl-ctrl-group').show()
    $('.mapboxgl-gl-draw_line,.mapboxgl-gl-draw_point,.mapboxgl-gl-draw_combine,.mapboxgl-gl-draw_uncombine').hide()
    if (map.getLayer('polygons_'+fileNm) !== undefined) {
        $(".colors-item .sp-preview-inner").css("background-color", map.getPaintProperty('polygons_'+fileNm,'fill-color'))
        $(".line-item .sp-preview-inner ").css("background-color", map.getPaintProperty('outline_'+fileNm,'line-color'))
        $("#line-width").val(map.getPaintProperty('outline_'+fileNm,'line-width'))
    }
    getProperties()
    openTab(event, 'tab3')
    // if (tabmenu.style.color === "#020202" || tabmenu.style.color === "" || tabmenu.style.color === "rgb(2, 2, 2)"){
    //     tablinks[2].classList.add("active-white");
    // } else {
    //     tablinks[2].classList.add("active-dark")
    // }
    if (map.getLayer('polygons_'+fileNm) !== undefined) {
        for (i = 0; i < fileNmList.length; i++) {
            map.on('mousemove', 'polygons_'+ fileNmList[i], function () {})
            map.on('mouseleave', 'polygons_'+ fileNmList[i], function () {})
            map.on('click', 'polygons_'+ fileNmList[i], function () {})
            map.setPaintProperty('polygons_'+fileNmList[i],'fill-opacity', 0.5);
        }
        var opacity = ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0.5]
        map.setPaintProperty('polygons_'+fileNm,'fill-opacity', opacity);
        map.on('click', 'polygons_'+fileNm, function (e) {
            selectedShp = e.features[0]
            if (e.features[0].layer.id === 'polygons_'+fileNm) {
                var property = "";
                var id = selectedShp.properties.DIST1_ID;
                var info = dataArr[fileNm].data.features
                for (i = 0; i < info.length; i++) {
                    if (info[i].properties.DIST1_ID === id) {
                        property = info[i]
                    }
                }
                $('#'+ id).parent().addClass("selected")

                openTab(event, 'tab3')
                // if (tabmenu.style.color === "#020202" || tabmenu.style.color === "" || tabmenu.style.color === "rgb(2, 2, 2)"){
                //     tablinks[2].classList.add("active-white");
                // } else {
                //     tablinks[2].classList.add("active-dark")
                // }

                editShp(property)
            }
        });

        map.on('mousemove', 'polygons_'+fileNm, (e) => {
            selectedShp = e.features
            if (e.features[0].layer.id === 'polygons_'+fileNm) {
                if (selectedShp.length > 0) {
                    if (hoveredPolygonId !== null) {
                        map.setFeatureState(
                            { source: 'data_'+fileNm, id: hoveredPolygonId },
                            { hover: false }
                        );
                    }
                    hoveredPolygonId = selectedShp[0].id;
                    map.setFeatureState(
                        { source: 'data_'+fileNm, id: hoveredPolygonId },
                        { hover: true }
                    );
                }
            }

        });
        map.on('mouseleave', 'polygons_'+fileNm, () => {
            if (hoveredPolygonId !== null) {
                map.setFeatureState(
                    { source: 'data_'+fileNm, id: hoveredPolygonId },
                    { hover: false }
                );
            }
            hoveredPolygonId = null;
        });
    }
}

function plusPolygon() {
    var features = draw.getAll().features;
    var obj = Object.keys(newProperty[fileNm])
    var ids = dataArr[fileNm].data.features.map(feature => feature.id);
    var maxId = Math.max.apply(null, ids)
    var property = $('#newpolygon .modal-body table').find('input')
    var properties = {}

    if (dataArr[fileNm].data.features.length === 0) {
        maxId = -1
    }

    for (i = 0; i < property.length; i++) {
        properties[obj[i]] = property[i].value
    }

    for (j = 0; j < features.length; j++) {
        if (features[j].properties[obj[0]] === undefined) {
            draw.delete(features[j].id)
            var newFeature = {
                id: String(maxId + 1),
                type: 'Feature',
                properties: properties,
                geometry: {
                    coordinates: features[j].geometry.coordinates,
                    type : "Polygon"
                },
            };
        }
    }
    if (map.getSource('data_'+fileNm) === undefined) {
        var tData = {
            type: 'geojson',
            data: {
                type : 'FeatureCollection',
                features : [
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
                'fill-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    0.5
                ]
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
        map.getSource('data_'+fileNm)._options.data.features.push(newFeature)
        var updatedFeatures = map.getSource('data_' + fileNm)._options.data.features;
        map.getSource('data_' + fileNm).setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });
        dataArr[fileNm] = map.getSource('data_' + fileNm)
    }


}