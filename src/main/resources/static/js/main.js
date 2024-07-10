const VWORLD_KEY = '826BBF47-98D0-3A2F-A444-A413695AB7F8'
const language = new MapboxLanguage();

const DEFAULT_ZOOMLVL = 14;
let linkNodeStationFeatures = {
    type : "FeatureCollection",
    features : []
};
let meterDotFeatures = {
    type : "FeatureCollection",
    features : []
};
// let shpLoadFeatures = {
//     type : "FeatureCollection",
//     features : []
// };
const COORD_ROUND = 6;

// property check 확인
let isChecked
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

let matchLinkObj = {}
let matchNodeObj = {}
let processDataType = "";

let pageIdx = 0;
const itemsPerPage = 100; // 페이지당 항목 수
let totalPages = 0

let pointPopup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
});

//정류소
const STATION_ICON_ID = 'station-icon';
const STATION_FEATURE_ID = 'station-feature';
const STATION_LAYER_ID = 'station-layer';
const LINK_NODE_STATION_SOURCE_ID = 'link-node-station-source';

//링크
const LINK_FEATURE_ID = 'link-feature';
const LINK_LAYER_ID = 'link-layer';
const LINK_LABEL_LAYER_ID = 'link-label-layer';

//노드
const NODE_ICON_ID = 'node-icon';
const NODE_FEATURE_ID = 'node-feature';
const NODE_LAYER_ID = 'node-layer';

// 링크 미터당 점 레이어
const METER_DOT_LAYER_ID = 'link-meter';
const METER_DOT_SOURCE_ID = 'link-source';
const METER_DOT_FEATURE_ID = 'link-feature';

// DB에 저장될 Shape 파일 인덱스 리스트
let shpDataIdxArr= [];

// DB에서 불러올 정보 리스트
let tNameArr = [];

// 보여줄 라벨 정의
let tNameLabelArr = {};


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
function openTab(obj, param) {
    $(".tab-links").removeClass("active");
    $(obj).addClass("active");

    $(".tab").hide();
    $("#"+param).show();
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

function getShpData(obj) {
    let fileName = $(this).text();

    // DB에서 불러올 명단에 추가
    tNameArr.push(fileName);
    // 기본 라벨 정의 key : value 로 임시 값 부여
    tNameLabelArr[fileName] = "";

    // 불러올 DB TABLE 을 선택. 지도 레벨이 일정 수준이 될때 정보를 표출
    if(map.getZoom() >= 14){
        if (!isEdit()) {
            setLinkNodeStationFeature();
        }
    } else {
        linkNodeStationFeatures.features = [];
        map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
    }

    // $.ajax({
    //     url : "/api/getShp",
    //     type : "POST",
    //     data : {
    //         shpId : shpId
    //     },
    //     beforeSend: function( ) {
    //         viewLoading()
    //     },
    //     complete: function( ) {
    //         finishLoading();
    //     },
    //     success : function(data) {
    //         hideModal('loadFile')
    //         if (fileNmList.length > 0) {
    //             var idx = 0
    //             for (i = 0; i < fileNmList.length; i++) {
    //                 if (fileNmList[i].indexOf(data.shpName) >  -1) {
    //                     idx += 1
    //                 }
    //             }
    //             if (idx !== 0) {
    //                 data.fileName = data.shpName + '_' + idx
    //             } else {
    //                 data.fileName = data.shpName
    //             }
    //         } else {
    //             data.fileName = data.shpName
    //         }
    //
    //         if (checkDataType(data) === 'Point') {
    //             drawNodePoint(data).then(r => true);
    //         } else if (checkDataType(data) === 'MultiLineString') {
    //             drawLinkLine(data).then(r => true);
    //         } else {
    //             drawPolyline(data).then(r => true);
    //         }
    //
    //         createLayer(data, checkDataType(data))
    //
    //         toastOn("DB에 저장된 정보를 가져왔습니다.")
    //     },
    //     error: function () {
    //     }
    // });
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
            finishLoading();
        },
        success: function (data) {
            /* geojson 형식
            * Point: [longitude, latitude]
            * LineString: [[longitude1, latitude1], [longitude2, latitude2], ...]
            * Polygon: [[[longitude1, latitude1], [longitude2, latitude2], ...], ...]
            */
            console.log(data.data)
            // shpLoadFeatures.features = data.data.features
            // readProperties(data.data.features[0].properties)
            // addShpList(data.data)
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
function editShp(property, type) {
    // 맵에서 데이터를 가져옴
    var geoData = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features;

    // 그리기 도구를 숨기고 표시
    $('.mapboxgl-ctrl-group').show();
    $('.mapboxgl-gl-draw_line, .mapboxgl-gl-draw_point, .mapboxgl-gl-draw_combine, .mapboxgl-gl-draw_uncombine').hide();

    // 현재 그려진 도형들을 가져와서 갱신
    draw.getAll().features.forEach(function(drawElement) {
        // 데이터 배열에서 해당 ID를 가진 도형을 찾아 갱신
        for (var i = 0; i < geoData.length; i++) {
            if (geoData[i].properties[type] === drawElement.properties[type]) {
                geoData[i] = drawElement;
                break;
            }
        }
    });

    // 주어진 속성의 ID와 일치하는 항목을 찾아 제거하고 새로운 속성 추가
    for (var i = 0; i < geoData.length; i++) {
        if (geoData[i].properties[type] === property.properties[type]) {
            // 해당 ID와 일치하는 도형을 제거하고 새로운 속성을 추가
            geoData.splice(i, 1);
            // 임시 아이디 부여
            property.id = draw.getAll().features.length + 1;
            draw.add(property);
            break; // 해당 도형을 찾았으므로 더 이상 반복할 필요가 없음
        }
    }

    map.getSource(LINK_NODE_STATION_SOURCE_ID).setData({
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
        hideAllTool();
        // 보기 모드로 전환
        startViewerMode()

        // 수정 내용삭제
        draw.deleteAll();

        // 수정 내용삭제 후 지도 정보 재로딩
        setLinkNodeStationFeature();
    } else if (draw.getAll().features.length === 0 && drawArr.length > 0) {
        drawArr = []
        propertyArr = []
        loadProperty = dataArr
    } else {
        alert('편집된 부분이 없습니다')
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
        // 방식 변경하며 변경
        if (e.features !== undefined) {
            selectedShp = e.features[0];
            selectedShp.id = 1;
            // 수정대상 타입 구분
            const featureType = selectedShp.geometry.type;
            let targetId;
            if (featureType.indexOf("LineString") > -1) {
                targetId = "linkId"

                showLinkTool();
            } else {
                if (selectedShp.properties.stationId !== undefined) {
                    targetId = "stationId"
                } else {
                    targetId = "nodeId"
                }

                showNodeStationTool();
            }
            const property = findProperty(selectedShp.properties[targetId], targetId);
            if (property) {
                // $('#' + selectedShp.properties[targetId]).parent().addClass("selected");
                editShp(property, targetId);
            }
        }
    } else {
        // 보기 모드 클릭 시 인포윈도우에 속성 정보 표시
        if (e.features !== undefined) {
            $('.property-window').css('left', '10px'); // 속성 창 띄우기
            $('.property-window > .property-list > table').empty() // 속성 리스트 비우기

            const properties = e.features[0].properties;
            let propertyHtml = '<tbody>';
            for (const key in properties) {
                propertyHtml += '<tr><td id='+e.features[0].id+'>' + key +'</td><td class="property-info">'+ properties[key] + '</td></tr>'; // 속성 정보
            }

            propertyHtml += '</tbody>';

            $('.property-window > .property-list > table').append(propertyHtml);
        }
    }
}

function closePropertyWindow() {
    $('.property-window').css('left', '-500px')
}

function closeShpPropertyWindow() {
    $('.shp-property-window').css('right', '80px')
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

function findProperty(id, type) {
    // const info = dataArr[fileNm].data.features;
    const info = linkNodeStationFeatures.features;
    for (let i = 0; i < info.length; i++) {
        if (info[i].properties[type] === id) {
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
            map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features.push(draw.getAll().features[i])
        }
    }

    if (fileNm !== '') { 
        var updatedFeatures = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features;
        // Set the updated data
        map.getSource(LINK_NODE_STATION_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: updatedFeatures
        });
        linkNodeStationFeatures.features = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features
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
                toastOn(data.msg);
            }
        },
        error : function(request, status, error) {
            toastOn("오류가 발생했습니다!" + "\n");
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
            sc_SW_LAT: turf.round(map.getBounds()._sw.lat, COORD_ROUND),
            fileName : JSON.stringify(tNameArr)
        };

        //
        if (tNameArr.length > 0) {
            requestAjax(params, function(result) {
                let geoJson = JSON.parse(result.data);
                for (let feature of geoJson.features) {
                    console.log(feature);
                    // 현재 적용된 라벨 설정
                    // tNameLabelArr[feature.properties]
                    // 노드,링크,정류소 포출 여부 판단
                    // 노드,링크,정류소 라벨 표출

                    // 정보 업데이트 - 링크, 노드, 정류소 공통 features 저장
                    linkNodeStationFeatures.features.push(feature);
                }
                // resolveStation();
            });
        }
        //
        //
        // // Station 처리
        // let stationPromise = new Promise(function(resolveStation, rejectStation) {
        //     if (stationShowFlag === true) {
        //         params["sc_MODE"] = "S";
        //         requestAjax(params, function(result) {
        //             let geoJson = JSON.parse(result.data);
        //             for (let feature of geoJson.features) {
        //                 // 현재 적용된 라벨 설정
        //                 if (stationShowLabel != undefined && stationShowLabel !== "arsId" && stationShowLabel !== "emptyLabel") {
        //                     feature.properties.label = feature.properties["arsId"] + "\n" + feature.properties[stationShowLabel];
        //                 } else {
        //                     feature.properties.label = feature.properties[stationShowLabel];
        //                 }
        //                 // 링크, 노드, 정류소 공통 features 저장
        //                 linkNodeStationFeatures.features.push(feature);
        //             }
        //             resolveStation();
        //         });
        //     } else {
        //         resolveStation(); // Station 처리가 필요 없는 경우 resolve
        //     }
        // });
        //
        // // Node 처리
        // let nodePromise = new Promise(function(resolveNode, rejectNode) {
        //     if (nodeShowFlag === true) {
        //         params["sc_MODE"] = "N";
        //         requestAjax(params, function(result) {
        //             let geoJson = JSON.parse(result.data);
        //             for (let feature of geoJson.features) {
        //                 if (nodeShowLabel != undefined) {
        //                     feature.properties.label = feature.properties[nodeShowLabel];
        //                 }
        //                 if (selectedNodeId.length > 0 && selectedNodeId === feature.properties.nodeId) {
        //                     feature.properties.iconColor = feature.properties.selectedIconColor;
        //                     feature.properties.iconSize = feature.properties.selectedIconSize;
        //                     feature.properties.textColor = feature.properties.selectedTextColor;
        //                     feature.properties.textSize = feature.properties.selectedTextSize;
        //                 }
        //                 linkNodeStationFeatures.features.push(feature);
        //             }
        //             resolveNode();
        //         });
        //     } else {
        //         resolveNode(); // Node 처리가 필요 없는 경우 resolve
        //     }
        // });
        //
        // // Link 처리
        // let linkPromise = new Promise(function(resolveLink, rejectLink) {
        //     if (linkShowFlag === true) {
        //         params["sc_MODE"] = "L";
        //         requestAjax(params, function(result) {
        //             let geoJson = JSON.parse(result.data);
        //             for (let feature of geoJson.features) {
        //                 if (linkShowLabel != undefined) {
        //                     feature.properties.label = feature.properties[linkShowLabel];
        //                 }
        //                 linkNodeStationFeatures.features.push(feature);
        //             }
        //             resolveLink();
        //         });
        //     } else {
        //         resolveLink(); // Link 처리가 필요 없는 경우 resolve
        //     }
        // });

        // 모든 Promise가 완료된 후에 레이어 추가
        // Promise.all([stationPromise, nodePromise, linkPromise]).then(function() {
        Promise.all([linkPromise]).then(function() {
            // 데이터 소스에 features 업데이트
            map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
            addAttrList()
            // 레이어가 없을 때만 추가
            // if (!map.getLayer(LINK_LAYER_ID) && !map.getLayer(STATION_LAYER_ID) && !map.getLayer(NODE_LAYER_ID)) {
            if (!map.getLayer(LINK_LAYER_ID) && !map.getLayer(METER_DOT_LAYER_ID)) {
                // 링크 레이어 추가
                setLayerTypeLine(LINK_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, LINK_FEATURE_ID, true);
                // 링크 거리별 포인트 레이어 추가
                setLayerLinkDot(METER_DOT_LAYER_ID, METER_DOT_SOURCE_ID);
                // 정류소 레이어 추가
                setLayerTypeIconAndLabel(STATION_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, STATION_FEATURE_ID, ICON_STATION_SRC);
                // 노드 레이어 추가
                setLayerTypeIconAndLabel(NODE_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, NODE_FEATURE_ID, "");
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
    // 링크의 첫 번째 점과 마지막 점에 가까운 노드를 찾는 함수
    function findClosestNodesToLinkEnds(linkCoordinates) {
        // 첫 번째 점과 마지막 점 추출
        var firstPoint = linkCoordinates[0];
        var lastPoint = linkCoordinates[linkCoordinates.length - 1];

        // 각 점에서 가장 가까운 노드 찾기
        var closestNodes = {
            startPoint: findClosestNode(firstPoint),
            endPoint: findClosestNode(lastPoint)
        };

        return closestNodes;
    }

    // 특정 점에서 가장 가까운 노드를 찾는 함수
    function findClosestNode(point) {
        var closestNode = null;
        var minDistance = Infinity;

        // 모든 노드를 반복하며 가장 가까운 노드 찾기
        linkNodeStationFeatures.features.forEach(function (feature) {
            if (feature.geometry.type === 'Point' && feature.properties.nodeId !== undefined) {
                var nodeCoordinates = feature.geometry.coordinates;
                var distance = calculateDistance(point, nodeCoordinates);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestNode = feature;
                }
            }
        });

        return closestNode;
    }

    // 두 점 사이의 거리 계산 함수 (예: 유클리디안 거리)
    function calculateDistance(point1, point2) {
        var dx = point1[0] - point2[0];
        var dy = point1[1] - point2[1];
        return Math.sqrt(dx * dx + dy * dy);
    }

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

        var clickedFeature = e.features[0];
        if (clickedFeature) {
            linkNodeStationFeatures.features.forEach(function (feature) {
                if (feature.geometry.type === 'LineString' && feature.properties.linkId === clickedFeature.properties.linkId) {
                    selectedBasicLink = feature.geometry.coordinates;
                }
            });

            // 클릭된 링크의 좌표 가져오기
            var linkCoordinates = clickedFeature.geometry.coordinates;

            // 링크의 첫 번째 점과 마지막 점에 가까운 노드 찾기
            var closestNodes = findClosestNodesToLinkEnds(linkCoordinates);
            var startPointNode = closestNodes.startPoint;
            var endPointNode = closestNodes.endPoint;

            // 시작 노드와 끝 노드 feature 추출 완료. 후 처리를 어떻게 하는지 못여쭈어봄;
            console.log('Closest start point node:', startPointNode);
            console.log('Closest end point node:', endPointNode);

        }
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
        'type' : 'circle',
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

// 시작점과 끝점 사이에 segmentLength 미터 간격으로 점 생성
function generatePoints(segmentLength) {
    let coordinates = selectedShp.geometry.coordinates;
    const points = [];
    const R = 6371000; // 지구의 반지름(미터 단위)

    // 도와 관련된 함수들
    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function haversineDistance(coord1, coord2) {
        const lat1 = toRadians(coord1[1]);
        const lat2 = toRadians(coord2[1]);
        const dLat = lat2 - lat1;
        const dLng = toRadians(coord2[0] - coord1[0]);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    function interpolatePoint(coord1, coord2, factor) {
        return [
            coord1[0] + (coord2[0] - coord1[0]) * factor,
            coord1[1] + (coord2[1] - coord1[1]) * factor
        ];
    }

    let currentPoint = coordinates[0];
    let remainingDistance = segmentLength;
    let accumulatedDistance = 0;
    points.push(currentPoint); // 첫 번째 점 추가

    for (let i = 1; i < coordinates.length; i++) {
        const nextPoint = coordinates[i];
        let segmentDistance = haversineDistance(currentPoint, nextPoint);

        // 첫 점과 다음 점 사이의 변수의 거리만큼 점 추가
        while (segmentDistance >= remainingDistance) {
            const factor = remainingDistance / segmentDistance;
            currentPoint = interpolatePoint(currentPoint, nextPoint, factor);
            accumulatedDistance += remainingDistance;
            points.push(currentPoint); // 새로 생성된 점 추가
            segmentDistance -= remainingDistance;
            remainingDistance = segmentLength;
        }

        accumulatedDistance += segmentDistance;
        remainingDistance -= segmentDistance;
        currentPoint = nextPoint;
        points.push(currentPoint); // 다음 원래의 점 추가
    }

    // 마지막 점이 원래 선의 마지막 점과 일치하지 않으면 추가
    if (points[points.length - 1][0] !== coordinates[coordinates.length - 1][0] ||
        points[points.length - 1][1] !== coordinates[coordinates.length - 1][1]) {
        points.push(coordinates[coordinates.length - 1]);
    }

        // 기존 선택된 선을 삭제하고 새로운 선을 추가
    draw.delete(selectedShp.id);

    // 새로운 피처 객체 생성
    const newFeature = {
        type: 'Feature',
        properties: { ...selectedShp.properties },
        geometry: {
            type: 'LineString',
            coordinates: points
        }
    };

    // 새로운 피처를 Draw에 추가
    draw.add(newFeature);
}

function getClosestLinkId(pointPos){
    //점과 선의 거리 중에서 가장가까운 link Id 찾기
    let closestId;
    let closestDist;
    let closestPointFeature;
    let clickPointFeature = turf.point(pointPos);

    for(let linkFeature of linkNodeStationFeatures.features){
        if(linkFeature.properties.featureId === LINK_FEATURE_ID){
            let tmpDist = turf.pointToLineDistance(clickPointFeature, linkFeature);

            if(!closestDist || closestDist > tmpDist){
                closestDist = tmpDist;
                closestId = linkFeature.properties.linkId;
                closestPointFeature = turf.nearestPointOnLine(linkFeature, clickPointFeature);
            }
        }
    }

    let selectMeter;

    //줌 레벨별로 광범위 수준 정도 확대
    if(getMapZoom() <= 14){
        selectMeter = 15;
    }else if(getMapZoom() <= 15){
        selectMeter = 10;
    }else{
        selectMeter = 5;
    }

    if(closestDist * 1000 > selectMeter || !closestPointFeature){
        return "";
    }else{
        let coord = closestPointFeature.geometry.coordinates;
        let pointPos = {lng : coord[0], lat : coord[1]};
        return pointPos;
    }

    return closestId;
}

function findClosestFeature(clickedPoint) {
    var closestDistance = Infinity;
    var closestFeature = null;

    // 맵 상의 모든 객체(레이어)를 반복하여 가장 가까운 객체 찾기
    map.getStyle().layers.forEach(function(layer) {
        if (layer.type === 'symbol' || layer.type === 'circle' || layer.type === 'line') {
            var features = map.queryRenderedFeatures(clickedPoint, { layers: [layer.id] });
            if (features.length > 0) {
                features.forEach(function(feature) {
                    var distance = turf.distance(turf.point([clickedPoint.lng, clickedPoint.lat]), turf.point(feature.geometry.coordinates));
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestFeature = feature;
                    }
                });
            }
        }
    });

    return closestFeature;
}

// 가장 가까운 피처 찾기 함수
function findClosestFeatureFromFeature(features, lngLat) {
    let minDistance = Infinity;
    let closestFeature = null;

    features.forEach(feature => {
        feature.geometry.coordinates.forEach(coord => {
            const distance = Math.sqrt(
                Math.pow(coord[0] - lngLat.lng, 2) + Math.pow(coord[1] - lngLat.lat, 2)
            );

            if (distance < minDistance) {
                minDistance = distance;
                closestFeature = feature;
            }
        });
    });

    return closestFeature;
}

function initBasicTileSet() {
    // 맵박스 초기화
    map = new mapboxgl.Map({
        container: "map",
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [126.88271541564299, 37.48151056694073],
        zoom: 11,
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.addControl(language);
    map.addControl(draw, 'bottom-left')

    setMapEvent();
}

function getVworldTilesSet(){
    map = new mapboxgl.Map({
        container: "map",
        style : {
            'version': 8,
            'sources': {
                'vworld-raster-tiles-source': {
                    'type': 'raster',
                    'tiles': ['https://api.vworld.kr/req/wmts/1.0.0/' + VWORLD_KEY + '/Base/{z}/{y}/{x}.png'],
                    'tileSize': 256,
                    'attribution': 'VWORLD'
                }
            },
            'layers': [
                {
                    'id': 'vworld-raster-tiles-layers',
                    'type': 'raster',
                    'source': 'vworld-raster-tiles-source',
                    'maxzoom': 19,
                    'minzoom': 6
                }
            ],
            "glyphs": "mapbox://fonts/mapbox/{fontstack}/{range}.pbf"
        },
        center: [126.88271541564299, 37.48151056694073],
        zoom: 11,
        //vworld 규정 지도 레벨 최대값 및 최소값으로 설정
        maxZoom: 18,
        minZoom: 6,
        dragRotate: false,
        preserveDrawingBuffer: true,
    });

    setMapEvent();
}

function setMapEvent() {
    map.on('load', function () {
        setSource(LINK_NODE_STATION_SOURCE_ID, linkNodeStationFeatures);
        setSource(METER_DOT_SOURCE_ID, meterDotFeatures);

        map.on('moveend', ()=>{
            if(map.getZoom() >= 14){
                if (!isEdit()) {
                    setLinkNodeStationFeature();
                }
            } else {
                linkNodeStationFeatures.features = [];
                map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
            }
        });

        map.on('click', (e) => {
            // 만약 핸들 포인트 window 가 켜져있다면 종료
            pointPopup.remove();

            //우선 정류소, 노드 클릭상황에서는 당연히 광범위한 링크 선택처리를 막는다.
            //링크 자체를 클릭해버리면 중복되므로 광범위한 링크 선택또한 막는다.
            if (map.getLayer(LINK_LAYER_ID) !== undefined) {
                let features = map.queryRenderedFeatures(e.point, {
                    layers : [STATION_LAYER_ID, LINK_LAYER_ID, NODE_LAYER_ID]
                });

                if(features.length > 0) {
                    return;
                }

                let pointPos = getClosestLinkId(new Array(e.lngLat.lng, e.lngLat.lat));

                if(!pointPos){
                    return;
                }

                map.fire('click', {
                    lngLat : pointPos,
                    point : map.project(pointPos)
                })

                handleFeatureSelection(e)
            }
        });

        map.on('contextmenu', (e) => {
            if (isEdit()) {
                // const features = map.queryRenderedFeatures(e.point, {
                //     layers: ['gl-draw-line.cold']
                // });
                const allFeatures = draw.getAll().features;
                const closestFeature = findClosestFeatureFromFeature(allFeatures, e.lngLat);

                console.log(closestFeature);

                if (closestFeature) {
                    selectedFeature = closestFeature;

                    if (selectedFeature.geometry.type.indexOf("LineString") > -1) {
                        pointPopup = new mapboxgl.Popup()
                            .setLngLat(e.lngLat)
                            .setDOMContent(createInfoWindowContent(e.lngLat))
                            .addTo(map);
                    }
                }
            }
        });

        map.on('mousemove', (e) => {
            if (map.getLayer(STATION_LAYER_ID) !== undefined) {
                //광범위한 링크 선택 근처 도달 시 마우스 모양 포인터로 처리
                let features = map.queryRenderedFeatures(e.point, {
                    layers : [STATION_LAYER_ID, LINK_LAYER_ID, NODE_LAYER_ID]
                });

                if(features.length > 0) {
                    return;
                }

                //위의 어떤 레이어가 포함되지 않은 상태에서
                let pointPos = getClosestLinkId(new Array(e.lngLat.lng, e.lngLat.lat), true);

                if(!pointPos){
                    map.getCanvas().style.cursor = '';
                } else {
                    map.getCanvas().style.cursor = 'pointer';
                }
            }
        });

        map.on('draw.update', realTimeUpdateToDB);
    })
}

// 지도에 표출된 정보만을 속성리스트에 제공
function addAttrList() {
    let nodeList = $("#node_list");
    let linkList = $("#link_list");
    let stationList = $("#station_list");

    // 속성리스트 초기화
    nodeList.find("div.layer-file").remove()
    linkList.find("div.layer-file").remove()
    stationList.find("div.layer-file").remove()

    const featureList = linkNodeStationFeatures.features;

    // 리스트 재생성
    let nodeHtml = "";
    let linkHtml = "";
    let stationHtml = "";
    for (let i = 0; i < featureList.length; i++ ) {
        let aData = featureList[i];
        const type = aData.geometry.type

        // 타입별 데이터 표출 분류
        if (type === 'LineString') {
            // 링크 처리
            // 링크선 가운데 값 추출
            let lng = aData.geometry.coordinates[Math.ceil(aData.geometry.coordinates.length / 2)][0]
            let lat = aData.geometry.coordinates[Math.ceil(aData.geometry.coordinates.length / 2)][1]
            linkHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\'' + lng + ',' + lat + '\')">'
            linkHtml += '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>'
            linkHtml += '<div class="file-info">'
            linkHtml += '<div class="file-tit">' + aData.properties.linkId + '</div>'
            linkHtml += '</div>'
            linkHtml += '</div>'
        } else {
            if (aData.properties.crossroadNm !== undefined) {
                // 노드 처리
                nodeHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\''+aData.geometry.coordinates[0]+","+aData.geometry.coordinates[1]+'\')">'
                nodeHtml += '<i class="fa-brands fa-hashnode" aria-hidden="true"></i>'
                nodeHtml += '<div class="file-info">'
                if (aData.properties.crossroadNm.trim() === "") {
                    nodeHtml += '<div class="file-tit">링크명 없음</div>'
                } else {
                    nodeHtml += '<div class="file-tit">' + aData.properties.crossroadNm.trim() +'</div>'
                }
                nodeHtml += '</div>'
                nodeHtml += '</div>'
            } else {
                // 정류소 처리
                stationHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\''+aData.geometry.coordinates[0]+","+aData.geometry.coordinates[1]+'\')">'
                stationHtml += '<i class="fas fa-bus"></i>'
                stationHtml += '<div class="file-info">'
                if (aData.properties.stationNm.trim() === "") {
                    stationHtml += '<div class="file-tit">정류소명 없음</div>'
                } else {
                    stationHtml += '<div class="file-tit">' + aData.properties.stationNm.trim() +'</div>'
                }
                stationHtml += '</div>'
                stationHtml += '</div>'
            }
        }
    }

    nodeList.append(nodeHtml);
    linkList.append(linkHtml);
    stationList.append(stationHtml);
}

function addShpList() {
    totalPages = Math.ceil(loadData.data.features.length / itemsPerPage);

    let target = $(".layer-file-list");
    // 속성리스트 초기화
    target.find("div.layer-file").remove()
    target.find(".empty-layer").hide()

    // 현재 페이지의 시작 인덱스와 끝 인덱스 계산
    let startIdx = pageIdx * itemsPerPage;
    let endIdx = startIdx + itemsPerPage;
    endIdx = endIdx > loadData.data.features.length ? loadData.data.features.length : endIdx;

    shpPropertyAllChecked()

    // 리스트 재생성
    let html = "";
    for (let i = startIdx; i < endIdx; i++) {
        let aData = loadData.data.features[i];
        if (aData.properties.isChecked === undefined) {
            aData.properties.isChecked = false
        }

        const type = aData.geometry.type

        // 타입별 데이터 표출 분류
        if (type.indexOf('LineString') > -1) {
            // 링크 처리
            html += '<div class="layer-file basic-font" >'
            if (aData.properties.isChecked === true || isAllChecked === true) {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_link" value="'+aData.properties[matchLinkObj.linkId]+'" onchange="shpPropertyCheck('+i+')" checked>'
            } else {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_link" value="'+aData.properties[matchLinkObj.linkId]+'" onchange="shpPropertyCheck('+i+')">'
            }
            html += '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>'
            html += '<div class="file-info">'
            html += '<div class="file-tit" onclick="shpPropertyDetail('+i+')">' + aData.properties[matchLinkObj.roadNm] + '</div>'
            html += '</div>'
            html += '</div>'
        } else {
            // 노드 처리
            html += '<div class="layer-file basic-font" >'
            if (aData.properties.isChecked === true || isAllChecked === true) {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_node" value="'+aData.properties[matchNodeObj.nodeId]+'" onchange="shpPropertyCheck('+i+')" checked>'
            } else {
                html += '<input  class="isCheck'+i+'" type="checkbox" name="selected_node" value="'+aData.properties[matchNodeObj.nodeId]+'" onchange="shpPropertyCheck('+i+')">'
            }
            html += '<i class="fa-brands fa-hashnode" aria-hidden="true"></i>'
            html += '<div class="file-info">'
            html += '<div class="file-tit" onclick="shpPropertyDetail('+i+')">' + aData.properties[matchNodeObj.crossroadNm] +'</div>'
            html += '</div>'
            html += '</div>'
        }
    }

    target.append(html);

    // 페이징 UI 업데이트
    updatePagingUI();

    $(".tab-links:eq(1)").click()
}

function shpPropertyAllChecked() {
    let allChecked = true
    let startIdx = pageIdx * itemsPerPage;
    let endIdx = startIdx + itemsPerPage;
    endIdx = endIdx > loadData.data.features.length ? loadData.data.features.length : endIdx;

    // 페이지 내 check가 하나라도 존재하면 allChecked = false
    for (let i = startIdx; i < endIdx; i++) {
        if (!loadData.data.features[i].properties.isChecked) {
            allChecked = false;
            break;
        }
    }

    if (allChecked) {
        $('#all-check').text('전체 취소')
    } else {
        $('#all-check').text('전체 선택')
    }
}

// shp 파일 속성 리스트에서 속성 보기 함수
function shpPropertyDetail(i) {
    let aFeature = loadData.data.features[i]
    let html = "<tbody>";
    $('.shp-property-window > .property-list.padding-10 > table').empty()

    for (const key in aFeature.properties) {
        html += '<tr><td id="'+key+'">'+key+'</td><td class="property-info">'+aFeature.properties[key]+'</td><tr>';
    }
    html += "</tbody>";

    $('.shp-property-window').css('right', '420px')
    $('.shp-property-window > div.property-list.padding-10 > table').append(html);
}

// shp 파일 속성 리스트에서 속성 체크 함수
function shpPropertyCheck(i) {
    if ($(".isCheck" + i).is(":checked")) {
        loadData.data.features[i].properties.isChecked = true;
        shpDataIdxArr.push(i);
        shpPropertyAllChecked()
    } else {
        loadData.data.features[i].properties.isChecked = false;
        let index = shpDataIdxArr.indexOf(i);
        if (index !== -1) {
            shpDataIdxArr.splice(index, 1);
        }
        shpPropertyAllChecked()
    }
}

let isAllChecked = false
//shp 파일 속성 리스트 전체 선택 함수
function shpListAllChecked() {
    let startIdx = pageIdx * itemsPerPage;
    let endIdx = startIdx + itemsPerPage;
    endIdx = endIdx > loadData.data.features.length ? loadData.data.features.length : endIdx;

    // 전체 선택의 경우 for 문의 리스트가 있어, flag 로 구분
    if ($('#all-check').text() === '전체 선택') {
        isAllChecked = true
        for (let i = startIdx ; i < endIdx ; i++) {
            loadData.data.features[i].properties.isChecked = true;
            $(".isCheck" + i).prop('checked', true);
        }
        $('#all-check').text('전체 취소')
    } else {
        isAllChecked = false
        for (let i = startIdx ; i < endIdx ; i++) {
            loadData.data.features[i].properties.isChecked = false;
            $(".isCheck" + i).prop('checked', false);
        }
        $('#all-check').text('전체 선택')
    }
}


// 이전 페이지 버튼 클릭 이벤트
$(document).on('click', '.prev-page', function() {
    if (pageIdx > 0) {
        pageIdx--;
        addShpList();
    }
});

// 다음 페이지 버튼 클릭 이벤트
$(document).on('click', '.next-page', function() {
    if (pageIdx < totalPages - 1) {
        pageIdx++;
        addShpList();
    }
});

function updatePagingUI() {
    let pagingHtml = '<div class="paging-controls">';
    if (pageIdx > 0) {
        pagingHtml += '<button class="prev-page">이전</button>';
    }
    pagingHtml += '<span>페이지 ' + (pageIdx + 1) + ' / ' + totalPages + '</span>';
    if (pageIdx < totalPages - 1) {
        pagingHtml += '<button class="next-page">다음</button>';
    }
    pagingHtml += '</div>';

    $('.paging-container').html(pagingHtml);
}

function moveThenClick(geo) {
    geo = geo.split(",");
    let pointPos = {lng : geo[0], lat : geo[1]};

    map.flyTo({
        center: [geo[0], geo[1]],
        zoom: map.getZoom()
    });

    map.fire('click', {
        lngLat : pointPos,
        point : map.project(pointPos)
    })
}

function openAttrTab(obj, param) {
    $(".attr_tab_bar li").removeClass("active");

    $(obj).addClass("active");

    $(".attr-list").hide()
    $("#"+param).show()
}

function readProperties() {
    // shp 타입 확인
    const shpType = loadData.data.features[0].geometry.type
    let optionHtml = "";
    // select 에 option 추가
    for (const key in loadData.data.features[0].properties) {
        optionHtml += '<option value="'+key+'">'+key+'</option>';
    }

    // 부합되는 타입에 옵션 추가 후 테이블 보여주는 부분
    if (shpType.indexOf("LineString") > -1) {
        processDataType = "link"
        $("#select_link_id").append(optionHtml);
        $("#select_road_nm").append(optionHtml);
        $("#attr-frm-link").show();
    } else if (shpType.indexOf("Point") > -1) {
        processDataType = "node"
        $("#select_node_id").append(optionHtml);
        $("#select_crossroad_nm").append(optionHtml);
        $("#attr-frm-node").show();
    }

    // 완료 후 모달 표출
    $("#modal_attr").modal('show');
}

function saveToMatchObject() {
    if (processDataType === 'link') {
        matchLinkObj.linkId = $("#select_link_id option:selected").val()
        matchLinkObj.roadNm = $("#select_road_nm option:selected").val()
    } else {
        matchNodeObj.nodeId = $("#select_node_id option:selected").val()
        matchNodeObj.crossroadNm = $("#select_crossroad_nm option:selected").val()
    }

    // 모달 내용 초기화
    $("#modal_attr").modal('hide');

    $("#attr-frm-link").hide();
    $("#attr-frm-node").hide();

    $("#select_link_id").find("option").remove();
    $("#select_road_nm").find("option").remove();
    $("#select_node_id").find("option").remove();
    $("#select_crossroad_nm").find("option").remove();

    // 정보 매칭이 완료되었으면 SHP 리스트에 정보 표출
    addShpList()
}

function realTimeUpdateToDB(e) {
    // 변경된 features를 가져옵니다.
    let feature;
    if (e.features === undefined) {
        feature = e;
    } else {
        feature = e.features[0];
    }

    // feature의 타입을 구분합니다.
    let type;
    if (feature.properties.nodeId !== undefined) {
        // 노드 처리
        type = "node"
    } else if (feature.properties.stationId !== undefined) {
        // 정류소 처리
        type = "station"
    } else {
        // 링크 처리
        type = "link"
    }

    // 서버로 전송할 데이터를 구성합니다.
    const data = {
        type: type,
        feature: feature
    };

    $.ajax({
        url : '/api/updateGeometry.do',
        type : 'POST',
        async : true,
        DataType : "JSON",
        contentType: "application/json",
        data : JSON.stringify(data),
        success : function (result){
            console.log(result)

            // toastOn("")
        },
        error : function (error){
            console.log(error)
        }
    })
}

function splitLine() {
    // 선택한 선의 좌표 가져오기
    var coordinates = selectedShp.geometry.coordinates;

    // 선을 분할할 중간 지점 계산
    var midPointIndex = Math.floor((coordinates.length-1) / 2);
    var part1Coords = coordinates.slice(0, midPointIndex + 1); // 첫 번째 선의 좌표
    var part2Coords = coordinates.slice(midPointIndex);      // 두 번째 선의 좌표

    // linkId를 숫자로 변환하고 새로운 아이디 할당
    var originalLinkId = parseInt(selectedShp.properties.linkId, 10);
    var newLinkId1 = originalLinkId;
    var newLinkId2 = originalLinkId + 1;

    // MapboxDraw에 추가할 두 개의 선 생성
    var feature1 = {
        type: 'Feature',
        properties: {
            ...selectedShp.properties, // 기존 선의 다른 속성 유지
            linkId: newLinkId1.toString() // 숫자를 문자열로 변환하여 저장
        },
        geometry: {
            type: 'LineString',
            coordinates: part1Coords
        }
    };

    var feature2 = {
        type: 'Feature',
        properties: {
            ...selectedShp.properties, // 기존 선의 다른 속성 유지
            linkId: newLinkId2.toString() // 숫자를 문자열로 변환하여 저장
        },
        geometry: {
            type: 'LineString',
            coordinates: part2Coords
        }
    };

    // MapboxDraw에 새로운 선 추가
    draw.add(feature1);
    draw.add(feature2);

    // 기존 선택된 선 삭제
    draw.delete(selectedShp.id);
}
function hideAllTool() {
    $("#link-tools").hide();
    $("#point-tools").hide();
}
function showLinkTool() {
    hideAllTool();
    $("#link-tools").show();
}
function showNodeStationTool() {
    hideAllTool();
    $("#point-tools").show();
}

function createInfoWindowContent(lngLat) {
    const container = document.createElement('div');

    const addButton = document.createElement('button');
    addButton.innerText = '핸들 포인트 추가';
    addButton.classList.add('btn-handle-point');
    addButton.onclick = function() {
        addHandle(selectedFeature, lngLat);
        pointPopup.remove();
    };

    const removeButton = document.createElement('button');
    removeButton.innerText = '핸들 포인트 삭제';
    removeButton.classList.add('btn-handle-point');
    removeButton.onclick = function() {
        removeHandle(selectedFeature, lngLat);
        pointPopup.remove();
    };

    container.appendChild(addButton);
    container.appendChild(removeButton);

    return container;
}

// 핸들 포인트 추가 함수
function addHandle(feature, lngLat) {
    const coordinates = feature.geometry.coordinates;
    const closestIndex = findClosestSegmentIndex(coordinates, lngLat);

    // 새로운 핸들 포인트를 추가
    coordinates.splice(closestIndex + 1, 0, [lngLat.lng, lngLat.lat]);

    feature.geometry.coordinates = coordinates;

    // Draw 객체에서 피처를 업데이트
    draw.delete(feature.id);
    draw.add(feature);
}

// 핸들 포인트 삭제 함수
function removeHandle(feature, lngLat) {
    const coordinates = feature.geometry.coordinates;
    const closestIndex = findClosestPointIndex(coordinates, lngLat);

    // 가장 가까운 핸들 포인트를 삭제
    coordinates.splice(closestIndex, 1);

    feature.geometry.coordinates = coordinates;

    // Draw 객체에서 피처를 업데이트
    draw.delete(feature.id);
    draw.add(feature);

    // 링크 점 삭제 바로 반영되게 업데이트 요청 실행
    realTimeUpdateToDB(feature)
}

// 가장 가까운 포인트 인덱스 찾기
function findClosestPointIndex(coordinates, lngLat) {
    let minDistance = Infinity;
    let closestIndex = -1;

    coordinates.forEach((coord, index) => {
        const distance = Math.sqrt(
            Math.pow(coord[0] - lngLat.lng, 2) + Math.pow(coord[1] - lngLat.lat, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = index;
        }
    });

    return closestIndex;
}

// 두 좌표 사이에서 가장 가까운 세그먼트 인덱스를 찾는 함수
function findClosestSegmentIndex(coordinates, lngLat) {
    let minDistance = Infinity;
    let closestIndex = -1;

    for (let i = 0; i < coordinates.length - 1; i++) {
        const segment = [coordinates[i], coordinates[i + 1]];
        const distance = pointToSegmentDistance(lngLat, segment);

        if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
        }
    }

    return closestIndex;
}

// 두 좌표 사이의 거리를 계산하는 함수
function pointToSegmentDistance(point, segment) {
    const x = point.lng;
    const y = point.lat;
    const x1 = segment[0][0];
    const y1 = segment[0][1];
    const x2 = segment[1][0];
    const y2 = segment[1][1];

    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function uploadShpTable() {
    $.ajax({
        url : '/api/uploadShpTable',
        type : 'POST',
        data : {
            fileName : fileNm,
            idxArr: JSON.stringify(shpDataIdxArr),
            isAllChecked : isAllChecked,
            shpType : shpType
        },
        success : function (result){
            console.log(result)
        },
        error : function (error){
            console.log(error)
        }
    })
}