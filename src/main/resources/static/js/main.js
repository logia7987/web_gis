// 메뉴 모드를 다크 모드 혹은 화이트 모드 바꾸는 함수
function toggleWhiteMode() {
    var icon = document.getElementById("mdicon");
    var styleOption = document.getElementsByClassName("style-option");

    if (tabmenu.style.color === "#020202" || tabmenu.style.color === "" || tabmenu.style.color === 'rgb(2, 2, 2)') {
        // 화이트 모드에서 다크 모드로 전환 될때
        $("#tab, #map-style").css("color", "#ffffff");
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
        tabmenu.style.backgroundColor = "#666";
        for (i = 0; i < styleOption.length; i++) {
            styleOption[i].style.color = "white"
        }
    } else {
        // 다크 모드에서 화이트 모드로 전환 될때
        $("#tab, #map-style").css("color", "#020202");
        icon.classList.add('fa-moon');
        icon.classList.remove('fa-sun');
        tabmenu.style.backgroundColor = "#fff"
        for (i = 0; i < styleOption.length; i++) {
            styleOption[i].style.color = "black"
        }
    }
}



function checkTab() {
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }
}

// 해당 탭을 여는 함수
function openTab(event, tab) {
    if (event.currentTarget.className === "tab-links") {
        checkTab()
        document.getElementById(tab).style.display = "block"
        event.currentTarget.className += " active";
    } else {
        checkTab()
    }
}

// 로딩 화면
function viewLoading() {
    $('#loading-window, .loading-logo').show();
    document.getElementById("map").style.position = "absolute";
}

// 로딩 종료
function finishLoading() {
    $('#loading-window, .loading-logo').hide();
    document.getElementById("map").style.position = "";
}

function showSearch() {
    $('#search-input').toggle()
}

function hideModal(id) {
    var myModalEl = document.getElementById(id);
    var modal = bootstrap.Modal.getInstance(myModalEl)
    modal.hide();
}

// 열린 shp 파일(파일 이름, 파일 저장한 날)을 db에 저장하는 함수
function saveShp(filename) {
    $.ajax({
        url : '/api/saveShp',
        type : 'POST',
        data : {
            shpName : filename
        },
        success : function (result){
            console.log(result)
            var shpId = result.shpId;

            for (var i = 0; i < dataArr[filename].data.features.length; i++) {
                saveFeature(shpId, dataArr[filename].data.features[i], (i+1));
            }

            var html = ""
            html = "<a href='#' onclick='getShpData("+shpId+")'>"+filename+"</a>"
            $('.options').append(html)
        },
        error : function (error){
            console.log(error)
        }
    })
}

// 열린 shp 파일 내 Feature들을 db에 저장하는 함수
function saveFeature(shpId, jsonObj, idx) {
    $.ajax({
        url : '/api/saveFeature',
        type : 'POST',
        dataType: 'json',
        contentType: 'application/json', // JSON으로 데이터를 전송함을 명시
        data: JSON.stringify({
            shpId: shpId,
            seq : idx,
            jsonObject: jsonObj
        }),
        success : function (result){
            console.log(result)
        },
        complete: function(xhr, status) {
            if (status === 'error' || !xhr.responseText) {
                console.log('Network error or empty response.');
            }
        },
        error : function (error){
            console.log(error)
        }
    })
}

function getShpData(shpId) {
    $.ajax({
        url : "/api/getShp",
        type : "POST",
        data : {
            shpId : shpId
        },
        beforeSend: function( ) {
            viewLoading()
        },
        complete: function( ) {
            finishLoading();
        },
        success : function(data) {
            console.log(data.data)
            data.fileName = data.shpName
            drawPolyline(data);
            createLayer(data)
        },
        error: function () {
        }
    });
}


// 그려진 폴리곤라인 지도 내에 한눈에 보이도록 하는 함수
function setMapBounds(data) {
    if (data.features[0].geometry.coordinates[0] === undefined) {

    } else {
        var bounds = new mapboxgl.LngLatBounds();
        data.features.forEach(function (feature) {
            var coordinates = feature.geometry.coordinates[0];
            coordinates.forEach(function (coordinate) {
                bounds.extend(coordinate);
            });
        });

        // 바운더리에 맞게 지도 조정
        map.fitBounds(bounds, { padding: 150 });
    }
}

function sendFiles() {
    hideModal('loadFile')

    var frmFile = $("#frmFile");
    // 파일 선택 input 요소
    var fileInput = frmFile.find("input[name='shpData']")[0];

    // 선택한 파일 가져오기
    var files = fileInput.files;
    var formData = new FormData();

    hasShp = false
    hasShx = false
    hasDdf = false


    for (var i = 0; i < files.length; i++) {
        if (files[i].name.indexOf('.shp') > -1) {
            hasShp = true
        } else if (files[i].name.indexOf('.shx') > -1) {
            hasShx = true
        } else if (files[i].name.indexOf('.dbf') > -1) {
            hasDdf = true
        }
    }

    if (hasShp === true && hasShx === true && hasDdf === true) {
        for (var i = 0; i < files.length; i++) {
            formData.append('shpData', files[i]);
        }
    } else {
        alert ("필수 파일을 확인해주세요.")
    }

    $.ajax({
        url: '/api/uploadShapeFiles',  // 서버 엔드포인트
        type: 'POST',
        data: formData,
        processData: false,  // 필수: FormData를 query string으로 변환하지 않음
        contentType: false,  // 필수: 파일 전송에는 multipart/form-data 형식이 필요
        beforeSend: function( ) {
            viewLoading()
        },
        complete: function( ) {
            // finishLoading();
        },
        success: function (data) {
            finishLoading();
            /* geojson 형식
            * Point: [longitude, latitude]
            * LineString: [[longitude1, latitude1], [longitude2, latitude2], ...]
            * Polygon: [[[longitude1, latitude1], [longitude2, latitude2], ...], ...]
            */
            // const dataType = checkDataType(data);
            // if (dataType === "Point")  {
            //     drawNodePoint(data);
            // } else if (dataType === "MultiLineString") {
            //     drawLinkLine(data)
            // } else {
            //     drawPolyline(data);
            // }
            // createLayer(data, dataType);
        },
        error: function (error) {
            console.error('Error uploading file:', error);
            finishLoading();
        }
    });
}


function removePolygon(key) {
    fileName = dataArr[key].fileName

    if (draw.getAll().length > 0) {
        draw.deleteAll();
    }
    map.removeLayer('polygons_'+fileName);
    map.removeLayer('outline_'+fileName);

    map.removeSource('data_'+fileName);
    $("#" + fileName).remove();

    for (i = 0; i < fileNmList.length; i++) {
        if (fileNmList[i] === fileName) {
            fileNmList.splice(i, 1)
        }
    }
    delete dataArr[key]

    if ($(".layer-file").length === 0) {
        $(".file-info-item").remove();
    }
}
function editShp(property) {
    // 맵에서 데이터를 가져옴
    var geoData = map.getSource('data_' + fileNm)._options.data.features;

    // 그리기 도구를 숨기고 표시
    $('.mapboxgl-ctrl-group').show();
    $('.mapboxgl-gl-draw_line, .mapboxgl-gl-draw_point, .mapboxgl-gl-draw_combine, .mapboxgl-gl-draw_uncombine').hide();

    // 현재 그려진 도형들을 가져와서 갱신
    draw.getAll().features.forEach(function(drawElement) {
        // 데이터 배열에서 해당 ID를 가진 도형을 찾아 갱신
        for (var i = 0; i < geoData.length; i++) {
            if (geoData[i].id === drawElement.id) {
                geoData[i] = drawElement;
                break; // 해당 도형을 찾았으므로 더 이상 반복할 필요가 없음
            }
        }
    });

    // 주어진 속성의 ID와 일치하는 항목을 찾아 제거하고 새로운 속성 추가
    for (var i = 0; i < geoData.length; i++) {
        if (geoData[i].id === property.id) {
            // 해당 ID와 일치하는 도형을 제거하고 새로운 속성을 추가
            geoData.splice(i, 1);
            draw.add(property);
            break; // 해당 도형을 찾았으므로 더 이상 반복할 필요가 없음
        }
    }

    // 업데이트된 데이터를 설정하여 맵의 데이터를 업데이트
    map.getSource('data_' + fileNm).setData({
        type: 'FeatureCollection',
        features: geoData
    });
}

document.addEventListener('contextmenu', function (){
    var text = document.getElementById("btn-status").textContent;

    if (draw.getMode() === 'simple_select' && $(".selected .fa-solid").length === 2 && text === '편집 모드' && draw.getAll().features.length > 0) {
        $('#newpolygon').modal('show')
        $('#newpolygon .modal-body table').empty()
        var property = Object.keys(newProperty[fileNm])
        for (var i = 0; i < property.length; i++) {
            var html = "<tr><td><label class='polygon-label' title="+property[i]+">"+property[i]+"</label></td><td><input class='property' type='text'></td></tr>"
            $('#newpolygon .modal-body table').append(html)
        }
    }
});

function changeEditMode() {
    if ( $('#btn-status').text() === '보기 모드') {
        // 편집 모드로 전환
        startEditMode()
    } else if ( $('#btn-status').text() === '편집 모드') {
        // 보기 모드로 전환
        startViewerMode()
    } else if (draw.getAll().features.length === 0 && drawArr.length > 0) {
        drawArr = []
        propertyArr = []
        loadProperty = dataArr
        // getProperties()
    } else {
        alert('편집된 부분이 없습니다')
    }
}

function checkDataType(data) {
    // 대표로 첫번째 인덱스의 정보를 가져와서 타입 검사 실시
    var type = data.data.features[0].geometry.type
    return type
}

function changePolygonColor() {
    var polygon = $("#polygon-color").val()
    polygonColor = polygon
    for (i = 0; i < fileNmList.length; i++) {
        if(fileNm === fileNmList[i]) {
            map.setPaintProperty('polygons_'+fileNmList[i],'fill-color', polygonColor);
        }
    }
}

function changeLineColor() {
    var line = $("#line-color").val()
    lineColor = line
    for (i = 0; i < fileNmList.length; i++) {
        if(fileNm === fileNmList[i]) {
            map.setPaintProperty('outline_'+fileNmList[i],'line-color', lineColor);
        }
    }
}

function  changeLineThickness() {
    var line = $("#line-width").val()
    lineWidth = line
    for (i = 0; i < fileNmList.length; i++) {
        if(fileNm === fileNmList[i]) {
            map.setPaintProperty('outline_'+fileNmList[i],'line-width', Number(lineWidth));
        }
    }
}

// 지도 스타일 변경하는 함수
mapSelect.onchange = (change) => {
    const changeId = change.target.value;
    map.setStyle('mapbox://styles/mapbox/' + changeId);
    // map.on('style.load', () => {
    //     for (i = 0; i < document.querySelectorAll('.file-tit').length; i++) {
    //         var Name = document.querySelectorAll('.file-tit')[i].textContent
    //         drawPolyline(dataArr[Name])
    //     }
    // });
}

function handleDragOver(e) {
    e.preventDefault();
    uploadContainer.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadContainer.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    uploadContainer.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    $('#file_intro h4').remove()
    $('.comment').remove()

    if (files.length > 0) {
        for (i = 0; i < files.length ; i++) {
            fileName = files[i].name
            var html = ""
            html = "<div class='dropfile basic-font'>"+fileName+"<i class=\"fas fa-solid fa-xmark\" onclick='deleteFileList()'></i></div>"
            $("#file_intro").append(html)
            $("#shpData").prop("files", e.dataTransfer.files)
        }
    }
}

function drawShpData(data) {
    const dataType = checkDataType(data);
    
    // 메모리 누수 방지를 위해 확실히 종료된 후에 createLayer 를 실행
    if (dataType === "Point") {
        drawNodePoint(data).then(function () {
            createLayer(data, dataType);
        });
    } else if (dataType === "MultiLineString") {
        drawLinkLine(data).then(function () {
            createLayer(data, dataType);
        })
    } else {
        drawPolyline(data).then(function () {
            createLayer(data, dataType);
        });
    }
}
// 지도범위 내의 피처만 표시하게 하는 함수
function renderDataOnMapViewport() {
    var zoomVal = map.getZoom()
    // 줌이 14이상일때 검사하게
    if (zoomVal >= 14 && fileNm != undefined) {
        var bounds = map.getBounds(); // 현재 지도의 경계 좌표를 가져옵니다.
        var dataInView = [];

        var feartureList = dataArr[fileNm].data.features
        var datatype = checkDataType(dataArr[fileNm]);
        // 데이터셋에서 현재 화면에 보이는 영역 내의 데이터를 필터링합니다.
        for (var i = 0; i < feartureList.length; i++) {
            var feature = feartureList[i];
            if (isFeatureInView(feature, bounds, datatype)) {
                dataInView.push(feature);
            }
        }

        // 타입에 맞는 도형 또는 점, 선을 그리게
        console.log(dataInView)
        // 두가지의 함수를 써야하여 고민 중
    }
}

// 특정 피처가 주어진 경계 내에 있는지 확인하는 함수
function isFeatureInView(feature, bounds, type) {
    // 피처의 경계 상자를 가져옵니다.
    var featureBounds = getBoundingBox(feature.geometry.coordinates, type);

    // 피처의 경계 상자가 지도의 경계 내에 있는지 확인합니다.
    return bounds.contains(featureBounds);
}

// 피처의 경계 상자를 계산하는 함수
function getBoundingBox(coordinates, type) {
    // 특정 지오메트리 유형(점, 선, 다각형 등)의 경계 상자를 계산하는 방법은 유형에 따라 다를 수 있습니다.
    let i;
    // 지금은 간단히 예시를 들기 위해 선(라인)의 경우 시작점과 끝점을 이용하여 경계 상자를 계산합니다.
    var minX = Infinity;
    var minY = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;

    var targetList;
    if (type === "Point")  {
        targetList = coordinates
    } else if (type === "MultiLineString") {
        targetList = coordinates[0]
    }
    for (i = 0; i < targetList.length; i++) {
        var point = targetList[i];
        minX = Math.min(minX, point[0]);
        minY = Math.min(minY, point[1]);
        maxX = Math.max(maxX, point[0]);
        maxY = Math.max(maxY, point[1]);
    }

    return [[minX, minY], [maxX, maxY]];
}

// "moveend" 이벤트와 "zoomend" 이벤트에 대한 이벤트 핸들러 등록
// 오류있어서 보류
// map.on('moveend', renderDataOnMapViewport);
// map.on('zoomend', renderDataOnMapViewport);

function handleFeatureSelection(e) {
    // 편집모드 클릭과 일반클릭을 분리
    if (isEdit()) {
        if (e.features !== undefined) {
            selectedShp = e.features[0];
            const property = findProperty(selectedShp.id);
            if (property) {
                $('#' + selectedShp.id).parent().addClass("selected");
                editShp(property);
            }
        }
    } else {
        // 보기 모드 클릭 시 인포윈도우에 속성 정보 표시
        const properties = e.features[0].properties;
        let propertyHtml = '<div>';
        for (const key in properties) {
            propertyHtml += '<p>' + key + ': ' + properties[key] + '</p>';
        }
        propertyHtml += '</div>';

        // 인포윈도우 열기
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(propertyHtml)
            .addTo(map);
    }
}

function isEdit() {
    if ($('#btn-status').text() === '편집 모드') {
        return true
    } else {
        return false
    }
}

function checkHasSource(sourceId, layerId) {
    if (map.getSource(sourceId)) {
        map.removeSource(sourceId);
    }
    if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
    }
}

function checkDistance() {
    draw.changeMode('draw_line_string');

    map.on('draw.create', function(e) {
        updateMeasurement(e)
        distanceId = e.features[0].id; // 선의 ID 저장
    });
    map.on('draw.update', updateMeasurement);
}

var distancePopup = null
var distanceId = null;
function updateMeasurement(e) {
    var features = e.features;
    var totalDistance = 0;
    var lastCoord;

    features.forEach(function(feature) {
        if (feature.geometry.type === 'LineString') {
            var coordinates = feature.geometry.coordinates;

            for (var i = 0; i < coordinates.length - 1; i++) {
                totalDistance += calculateDistance(coordinates[i], coordinates[i + 1]);
            }

            lastCoord = coordinates[coordinates.length - 1];
        }
    });

    if (lastCoord) {
        // 거리를 조건에 따라 km 또는 m 단위로 표시
        var distanceText = totalDistance >= 1
            ? totalDistance.toFixed(2) + ' km'
            : (totalDistance * 1000).toFixed(2) + ' m';

        console.log('Creating popup at', lastCoord, 'with distance', distanceText);

        // 기존 팝업 제거
        if (distancePopup) {
            distancePopup.remove();
        }

        var popupOptions = {
            closeOnClick: false, // 클릭 시 닫히지 않음
            closeButton: true // 닫기 버튼 표시
        };
        // 새로운 팝업 생성
        distancePopup = new mapboxgl.Popup(popupOptions)
            .setLngLat(lastCoord)
            .setHTML('총 거리 : ' + distanceText + '<br><button onclick="endMeasurement()">종료</button>')
            .addTo(map);
    }
}

function endMeasurement() {
    if (distanceId) {
        // 그려진 선 삭제
        draw.delete(distanceId);
        distanceId = null; // 저장된 선 ID 초기화
    }

    if (distancePopup) {
        distancePopup.remove();
    }
    draw.changeMode('simple_select'); // 측정 모드 종료
}

function calculateDistance(coord1, coord2) {
    var lat1 = coord1[1];
    var lon1 = coord1[0];
    var lat2 = coord2[1];
    var lon2 = coord2[0];

    var R = 6371; // 지구 반지름km
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // km 단위
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function findProperty(id) {
    const info = dataArr[fileNm].data.features;
    for (let i = 0; i < info.length; i++) {
        if (Number(info[i].id) === id) {
            return info[i];
        }
    }
    return null;
}

function startViewerMode() {
    $('.mapboxgl-ctrl-group').hide()
    $('#btn-status').text("보기 모드")

    if (draw.getAll().features.length > 0) {
        for (i = 0; i < draw.getAll().features.length; i++) {
            map.getSource('data_' + fileNm)._options.data.features.push(draw.getAll().features[i])
        }
    }
    var updatedFeatures = map.getSource('data_' + fileNm)._options.data.features;
    // Set the updated data
    map.getSource('data_' + fileNm).setData({
        type: 'FeatureCollection',
        features: updatedFeatures
    });
    dataArr[fileNm].data.features = map.getSource('data_' + fileNm)._options.data.features
    loadProperty = dataArr
    // getProperties()
    draw.deleteAll();
    propertyArr = []
    drawArr = []
}

function startEditMode() {
    fileNm = $('.selected .file-tit').text()
    $('#btn-status').text("편집 모드")
    // var type = $(".selected").eq(0).attr("class");
    var type = $($(".selected").find(".fa-solid")[0]).attr("class")
    loadProperty = dataArr
    if (type === 'fa-solid fa-ellipsis-vertical')  {
        getLinkDetail()
    } else if (type === 'fa-solid fa-share-nodes') {
        getNodeDetail()
    } else {
        polygonDetail()
    }
}