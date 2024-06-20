const DEFAULT_ZOOMLVL = 14;
let linkNodeStationFeatures = {
    type : "FeatureCollection",
    features : []
};
let meterDotFeatures = {
    type : "FeatureCollection",
    features : []
};
const COORD_ROUND = 6;

let selectedStationId = "";
let selectedLinkId = "";
let selectedNodeId = "";

let viaStationSelectIds = [];

let dragStationFeature = {}
//정보 출력 및 라벨명 선택 고정값
let stationShowFlag = true;
let stationShowLabel;

let nodeShowFlag = true;
let nodeShowLabel;

let linkShowFlag = true;
let linkShowLabel;

//링크 편집 선택모드
let editLinkMode = false;
let editLinkIds = [];
let editLinkSelectIds = [];
let dblClickIndexStation = '';
let dblClickLinkId = '';

let selectedBasicLink;

const ICON_STATION_SRC = '/image/icon_station.png';

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

            toastOn("레이어가 DB에 저장되었습니다.")
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
            hideModal('loadFile')
            if (fileNmList.length > 0) {
                var idx = 0
                for (i = 0; i < fileNmList.length; i++) {
                    if (fileNmList[i].indexOf(data.shpName) >  -1) {
                        idx += 1
                    }
                }
                if (idx !== 0) {
                    data.fileName = data.shpName + '_' + idx
                } else {
                    data.fileName = data.shpName
                }
            } else {
                data.fileName = data.shpName
            }

            if (checkDataType(data) === 'Point') {
                drawNodePoint(data).then(r => true);
            } else if (checkDataType(data) === 'MultiLineString') {
                drawLinkLine(data).then(r => true);
            } else {
                drawPolyline(data).then(r => true);
            }

            createLayer(data, checkDataType(data))

            toastOn("DB에 저장된 정보를 가져왔습니다.")
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


function removeLayer(key) {
    let fileName = dataArr[key].fileName

    if (draw.getAll().length > 0) {
        draw.deleteAll();
    }

    if (checkDataType(dataArr[fileName]) === 'Point') {
        map.removeLayer('nodes_'+fileName);
    } else if (checkDataType(dataArr[fileName]) === 'MultiLineString') {
        map.removeLayer('links_'+fileName);
    } else {
        map.removeLayer('polygons_'+fileName);
        map.removeLayer('outline_'+fileName);
    }

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

    isEmptyLayerList()

    toastOn("레이어를 삭제했습니다.")
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
    if ($('.layer-file').length === 0) {
        alert('레이어가 없습니다 레이어를 생성해주세요')
    } else {
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
}

function checkDataType(data) {
    // 대표로 첫번째 인덱스의 정보를 가져와서 타입 검사 실시
    var type
    if (data.data === undefined) {
        type = data.features[0].geometry.type
    } else {
        if (data.data.features.length === 0) {
            // 새로 추가된 객체는 타입이없음
            var selectedClass = $($(".selected").find("i")[0]).attr("class")
            if (selectedClass === 'fa-brands fa-hashnode')  {
                type = 'Point'
            } else if (selectedClass === 'fa-solid fa-share-nodes') {
                type = 'MultiLineString'
            } else {
                type = "MultiPolygon"
            }
        } else {
            type = data.data.features[0].geometry.type
        }
    }
    return type
}

function changePolygonColor() { // 폴리곤 색 변경
    var polygon = $("#polygon-color").val()
    polygonColor = polygon
    for (i = 0; i < fileNmList.length; i++) {
        if($('.selected')[0].id === fileNmList[i]) {
            map.setPaintProperty('polygons_'+fileNmList[i],'fill-color', polygonColor);
        }
    }
}

function changePolyLineColor() { // 폴리곤 선 색 변경
    var line = $("#polylineColor").val()
    polylineColor = line
    for (i = 0; i < fileNmList.length; i++) {
        if($('.selected')[0].id === fileNmList[i]) {
            map.setPaintProperty('outline_'+fileNmList[i],'line-color', polylineColor);
        }
    }
}

function  changePolyLineThickness() { // 폴리곤 선 굵기 변경
    var line = $("#poly-line-width").val()
    polylineWidth = line
    if (line < 0) {
        $("#poly-line-width").val('0.1')
        line = $("#poly-line-width").val()
        polylineWidth = line
        alert("0 미만 지원하지 않습니다")
    }
    for (i = 0; i < fileNmList.length; i++) {
        if($('.selected')[0].id === fileNmList[i]) {
            map.setPaintProperty('outline_'+fileNmList[i],'line-width', Number(polylineWidth));
        }
    }
}

function changeNodeColor() {
    var Node = $("#node-color").val()
    nodeColor = Node
    for (i = 0; i < fileNmList.length; i++) {
        if($('.selected')[0].id === fileNmList[i]) {
            map.setPaintProperty('nodes_'+fileNmList[i],'circle-color', nodeColor);
        }
    }
}

function changeLinkColor() {
    var Link = $("#link-color").val()
    linkColor = Link
    for (i = 0; i < fileNmList.length; i++) {
        if($('.selected')[0].id === fileNmList[i]) {
            map.setPaintProperty('links_'+fileNmList[i],'line-color', linkColor);
        }
    }
}

// 지도 스타일 변경하는 함수
// mapSelect.onchange = (change) => {
//     const changeId = change.target.value;
//     map.setStyle('mapbox://styles/mapbox/' + changeId);
//     map.on('style.load', () => {
//         for (i = 0; i < document.querySelectorAll('.file-tit').length; i++) {
//             var Name = document.querySelectorAll('.file-tit')[i].textContent
//             drawPolyline(dataArr[Name])
//         }
//     });
// }

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

    if (fileNmList.length > 0) { // 파일 이름 중복 여부 체크 후 동일하게 존재 시 _숫자 붙도록
        var idx = 0
        for (i = 0; i < fileNmList.length; i++) {
            if (fileNmList[i].indexOf(data.fileName) >  -1) {
                idx += 1
            }
        }
        if (idx !== 0) {
            data.fileName += '_' + idx
        }
    }
    
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
        if (e.features !== undefined) {
            $('.property-window').css('left', '10px'); // 속성 창 띄우기
            $('.property-list table').empty() // 속성 리스트 비우기

            const properties = e.features[0].properties;
            let propertyHtml = '<tbody>';
            for (const key in properties) {
                propertyHtml += '<tr><td id='+e.features[0].id+'>' + key +'</td><td class="property-info">'+ properties[key] + '</td></tr>'; // 속성 정보
            }

            propertyHtml += '</tbody>';

            $('.property-list table').append(propertyHtml);
        }
    }
}

function closePropertyWindow() {
    $('.property-window').css('left', '-500px')
}

function closeLayerOptionWindow() {
    $('.layer-option-window').css('left', '-500px')
}

function openLayerOptionWindow() {
    $('.layer-option-window').css('left', '10px')
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
    toastOn("보기 모드로 전환되었습니다.")
    $('.mapboxgl-ctrl-group').hide()
    $('#btn-status').text("보기 모드")

    if (draw.getAll().features.length > 0) { // 편집 모드에서 편집하던 draw 전부 반영되도록
        for (i = 0; i < draw.getAll().features.length; i++) {
            map.getSource('data_' + fileNm)._options.data.features.push(draw.getAll().features[i])
        }
    }

    if (fileNm !== '') { 
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
}


function startEditMode() {
    toastOn("편집모드로 전환되었습니다. 좌측하단의 툴을 이용해 지도 위에 그리기가 가능합니다.")

    fileNm = $('.selected .file-tit').text()
    $('#btn-status').text("편집 모드")
    // var type = $(".selected").eq(0).attr("class");
    var type = $($(".selected").find("i")[0]).attr("class")
    loadProperty = dataArr
    if (type === 'fa-solid fa-share-nodes')  {
        getLinkDetail()
        $('.mapbox-gl-draw_point, .mapbox-gl-draw_polygon, .mapbox-gl-draw_combine, .mapbox-gl-draw_uncombine').hide() // 노드 추가 제외하고 다 숨김 처리
        $('.mapbox-gl-draw_line').show()
    } else if (type === 'fa-brands fa-hashnode') {
        getNodeDetail()
        $('.mapbox-gl-draw_line, .mapbox-gl-draw_polygon, .mapbox-gl-draw_combine, .mapbox-gl-draw_uncombine').hide() // 링크 추가 제외하고 다 숨김 처리
        $('.mapbox-gl-draw_point').show()
    } else if (type === 'fa-solid fa-draw-polygon') {
        polygonDetail()
        $('.mapbox-gl-draw_line, .mapbox-gl-draw_point, .mapbox-gl-draw_combine, .mapbox-gl-draw_uncombine').hide() // 폴리곤 추가 제외하고 다 숨김 처리
        $('.mapbox-gl-draw_polygon').show()
    }

    $('.mapboxgl-ctrl-group').show()

    // 새 Feature 가 추가되는 걸 감지하는 부분
    map.on('draw.create', function(e) {
        const features = e.features;
        if (features.length > 0 && features[0].geometry.type === 'Point') {
            // 새 노드가 추가되었을 때
            $("#modal_addFeature").text("새로운 노드 생성")
        } else if (features.length > 0 && features[0].geometry.type === 'LineString') {
            // 새 링크가 추가되었을 때
            $("#modal_addFeature").text("새로운 링크 생성")
        } else if (features.length > 0 && features[0].geometry.type === 'Polygon') {
            // 새 폴리곤이 추가되었을 때
            $("#modal_addFeature").text("새로운 폴리곤 생성")
        }
        $('#newpolygon').modal('show')
        $('#newpolygon .modal-body table').empty()
        var property = Object.keys(newProperty[fileNm])
        for (var i = 0; i < property.length; i++) {
            var html = "<tr>" +
                "<td>" +
                "<label class='polygon-label' title="+property[i]+">"+property[i]+"</label>" +
                "</td>" +
                "<td>" +
                "<input class='form-control property' type='text'>" +
                "</td>" +
                "</tr>"
            $('#newpolygon .modal-body table').append(html)
        }
    });
}

function addNewFeature() { // 버튼 클릭 시 입력 토대로 데이터에 내용이 추가됨
    var features = draw.getAll().features;
    var obj = Object.keys(newProperty[fileNm])
    var ids = dataArr[fileNm].data.features.map(feature => feature.id);
    var maxId = Math.max.apply(null, ids)
    var property = $('#newpolygon .modal-body table').find('input')
    var properties = {}
    var proper = $('.property')
    var isProperty = true

    for (i = 0; i < proper.length; i++) { // 빈칸 여부 체크
        if (proper[i].value === '') {
            toastOn("빈칸을 채워주세요.")
            isProperty = false;
            break;
        }
    }

    if (isProperty) {
        if (dataArr[fileNm].data.features.length === 0) {
            maxId = -1
        }

        for (i = 0; i < property.length; i++) {
            properties[obj[i]] = property[i].value
        }

        if (checkDataType(dataArr[fileNm]) === 'Point') { // 폴리곤, 노드, 링크 구분 작업
            updateNodeData(features, properties, maxId)
        } else if (checkDataType(dataArr[fileNm]) === 'MultiLineString' || checkDataType(dataArr[fileNm]) === 'LineString') {
            updateLinkData(features, properties, maxId)
        } else if (checkDataType(dataArr[fileNm]) === 'MultiPolygon' || checkDataType(dataArr[fileNm]) === 'Polygon') {
            updatePolygonData(features, properties, maxId)
        }
        $('#newpolygon').modal('hide')
        toastOn("정상적으로 추가되었습니다.")
    }
}

function cancelAdd() { // 취소 버튼 눌렀을 때 그렸던 draw 내용 제거
    var checkData= draw.getAll().features
    for (i = 0; i < checkData.length; i++) {
        if (Object.keys(checkData[i].properties).length === 0) {
            draw.delete(checkData[i].id)
        }
    }
    $('#newpolygon').modal('hide')
}

function updateSourceData(newFeature) {
    map.getSource('data_'+fileNm)._options.data.features.push(newFeature)
    var updatedFeatures = map.getSource('data_' + fileNm)._options.data.features;
    map.getSource('data_' + fileNm).setData({
        type: 'FeatureCollection',
        features: updatedFeatures
    });
    // dataArr[fileNm] = map.getSource('data_' + fileNm);
    // dataArr[fileNm].data.features.push(newFeature)
}

function toastOn(t){
    $("#toast_popup").addClass('active');
    $("#toast_text").text(t)
    setTimeout(function(){
        $("#toast_popup").removeClass('active');
        $("#toast_text").text("")
    },2500);
}

function isEmptyLayerList() {
    var layerLength = $(".layer-file-list").length

    if (layerLength === 0) {
        $(".empty-layer").show();
    } else {
        $(".empty-layer").hide();
    }
}

function getMapZoom(){
    return Math.floor(map.getZoom());
}

function getSession() {
    //
    $.ajax({
        url : "http://115.88.124.254:9090/checkSession.bms",
        data: {
            isForced: false,
            userId: "qc100",
            pwd: "a!1234567"
        },
        dataType: "json",
        contentType: 'application/json',
        type: 'POST',
        beforeSend : function (xmlHttpRequest){
            // $("body").mLoading('show');
            xmlHttpRequest.setRequestHeader("AJAX", "true");
            xmlHttpRequest.setRequestHeader('X-CSRF-TOKEN', $('#csrf').val());
        },
        success : function(data) {
            console.log("세션 획득");
        },
        error : function(request, status, error) {
            alert("오류가 발생했습니다!" + "\n");
        },
    });
}


function requestAjax(params, callback, asyncFlag) {
    $.ajax({
        url : "/api/getData.do",
        data: JSON.stringify(params),
        dataType: "json",
        contentType: 'application/json',
        type: 'POST',
        success : function(data) {
            if(data.success) {
                if(callback) callback(data);
            } else {
                alert(data.msg);
            }
        },
        error : function(request, status, error) {
            alert("오류가 발생했습니다!" + "\n");
        },
    });
}



function setLinkNodeStationFeature() {
    return new Promise(function(resolve, reject) {
        // 공통 features 초기화
        linkNodeStationFeatures.features = [];

        // sc파라미터 정의
        let params = {
            sc_NE_LNG: turf.round(map.getBounds()._ne.lng, COORD_ROUND),
            sc_NE_LAT: turf.round(map.getBounds()._ne.lat, COORD_ROUND),
            sc_SW_LNG: turf.round(map.getBounds()._sw.lng, COORD_ROUND),
            sc_SW_LAT: turf.round(map.getBounds()._sw.lat, COORD_ROUND)
        };

        // Station 처리
        let stationPromise = new Promise(function(resolveStation, rejectStation) {
            if (stationShowFlag === true) {
                params["sc_MODE"] = "S";
                requestAjax(params, function(result) {
                    let geoJson = JSON.parse(result.data);
                    for (let feature of geoJson.features) {
                        // 현재 적용된 라벨 설정
                        if (stationShowLabel != undefined && stationShowLabel !== "arsId" && stationShowLabel !== "emptyLabel") {
                            feature.properties.label = feature.properties["arsId"] + "\n" + feature.properties[stationShowLabel];
                        } else {
                            feature.properties.label = feature.properties[stationShowLabel];
                        }
                        // 링크, 노드, 정류소 공통 features 저장
                        linkNodeStationFeatures.features.push(feature);
                    }
                    resolveStation();
                });
            } else {
                resolveStation(); // Station 처리가 필요 없는 경우 resolve
            }
        });

        // Node 처리
        let nodePromise = new Promise(function(resolveNode, rejectNode) {
            if (nodeShowFlag === true) {
                params["sc_MODE"] = "N";
                requestAjax(params, function(result) {
                    let geoJson = JSON.parse(result.data);
                    for (let feature of geoJson.features) {
                        if (nodeShowLabel != undefined) {
                            feature.properties.label = feature.properties[nodeShowLabel];
                        }
                        if (selectedNodeId.length > 0 && selectedNodeId === feature.properties.nodeId) {
                            feature.properties.iconColor = feature.properties.selectedIconColor;
                            feature.properties.iconSize = feature.properties.selectedIconSize;
                            feature.properties.textColor = feature.properties.selectedTextColor;
                            feature.properties.textSize = feature.properties.selectedTextSize;
                        }
                        linkNodeStationFeatures.features.push(feature);
                    }
                    resolveNode();
                });
            } else {
                resolveNode(); // Node 처리가 필요 없는 경우 resolve
            }
        });

        // Link 처리
        let linkPromise = new Promise(function(resolveLink, rejectLink) {
            if (linkShowFlag === true) {
                params["sc_MODE"] = "L";
                requestAjax(params, function(result) {
                    let geoJson = JSON.parse(result.data);
                    for (let feature of geoJson.features) {
                        if (linkShowLabel != undefined) {
                            feature.properties.label = feature.properties[linkShowLabel];
                        }
                        linkNodeStationFeatures.features.push(feature);
                    }
                    resolveLink();
                });
            } else {
                resolveLink(); // Link 처리가 필요 없는 경우 resolve
            }
        });

        // 모든 Promise가 완료된 후에 레이어 추가
        Promise.all([stationPromise, nodePromise, linkPromise]).then(function() {
            // 데이터 소스에 features 업데이트
            map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);

            // 레이어가 없을 때만 추가
            if (!map.getLayer(LINK_LAYER_ID) && !map.getLayer(STATION_LAYER_ID) && !map.getLayer(NODE_LAYER_ID)) {
                // 링크 레이어 추가
                setLayerTypeLine(LINK_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, LINK_FEATURE_ID, true);
                // 정류소 레이어 추가
                setLayerTypeIconAndLabel(STATION_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, STATION_FEATURE_ID, ICON_STATION_SRC);
                // 노드 레이어 추가
                setLayerTypeIconAndLabel(NODE_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, NODE_FEATURE_ID, "");
                // 링크 거리별 포인트 레이어 추가
                setLayerLinkDot(METER_DOT_LAYER_ID, METER_DOT_SOURCE_ID);
            }
            resolve();
        }).catch(function(error) {
            reject(error);
        });
    });
}

function setSource(sourceId, features){
    map.addSource(sourceId, {
        type: 'geojson',
        data: features
    });
}

function setLayerTypeIconAndLabel(layerId, sourceId, featureId, symbolImage){
    if (symbolImage === "") {
        map.addLayer({
            'id' : layerId,
            'type' : 'circle',
            'source' : sourceId,
            'paint': {
                'circle-radius': 6,
                'circle-color': '#001ab0',
                'circle-opacity': [
                    'case',
                    ['boolean', ['feature-state', 'hover'], false],
                    1,
                    1
                ]
            },
            'filter' : ['==', 'featureId', featureId]
        });
    } else {
        map.loadImage(symbolImage, function (error, image) {
            if (error) throw error;
            map.addImage('custom-icon', image);

            map.addLayer({
                'id': layerId,
                'type': 'symbol',
                'source': sourceId,
                'layout': {
                    'icon-image': 'custom-icon',
                    'icon-size': 0.5,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true
                },
                'filter': ['==', 'featureId', featureId]
            });
        });
    }

    map.on('click', layerId, function (e) {
        handleFeatureSelection(e);
    });

    map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
    });
}

function setLayerTypeLine(layerId, sourceId, featureId, popupFlag){
    map.addLayer({
        'id' : layerId,
        'type' : 'line',
        'source' : sourceId,
        'paint': {
            'line-color': '#000',
            'line-width': 2
        },
        'filter' : ['==', 'featureId', featureId]
    });
    map.on('click', layerId, function (e) {
        handleFeatureSelection(e);

        selectedBasicLink = e.features[0].properties;
    });

    map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
    });
}

function setLayerLinkDot(layerId, sourceId) {
    map.addLayer({
        'id' : layerId,
        'type' : 'line',
        'source' : sourceId,
        'paint': {
            'circle-radius': 6,
            'circle-color': nodeColor,
            'circle-opacity': [
                'case',
                ['boolean', ['feature-state', 'hover'], false],
                1,
                1
            ]
        }
    });
}

// 시작점과 끝점 사이에 5미터 간격으로 점 생성
function generatePoints(segmentLength) {
    let beginLat = parseFloat(selectedBasicLink["beginLat"]);
    let beginLng = parseFloat(selectedBasicLink["beginLng"]);
    let endLat = parseFloat(selectedBasicLink["endLat"]);
    let endLng = parseFloat(selectedBasicLink["endLng"]);

    const latDiff = endLat - beginLat;
    const lngDiff = endLng - beginLng
    let totalDistance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    const points = [];
    const numPoints = Math.floor(totalDistance / segmentLength);
    const latStep = (endLat - beginLat) / numPoints;
    const lngStep = (endLng - beginLng) / numPoints;

    for (let i = 0; i <= numPoints; i++) {
        const lat = beginLat + i * latStep;
        const lng = beginLng + i * lngStep;
        points.push({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat] // GeoJSON에서는 경도, 위도 순서로 되어 있음
            },
            properties: {
                name: 'Point ' + i,
                meter: segmentLength  // 미터 정보 추가
            }
        });
    }

    meterDotFeatures.features = points

    map.getSource(METER_DOT_SOURCE_ID).setData(meterDotFeatures);
}
