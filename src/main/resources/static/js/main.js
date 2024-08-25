const VWORLD_KEY = '826BBF47-98D0-3A2F-A444-A413695AB7F8'
const language = new MapboxLanguage();

const DEFAULT_ZOOMLVL = 14;
let linkNodeStationFeatures = {
    type : "FeatureCollection",
    features : []
};
let polygonFeatures = {
    type : "FeatureCollection",
    features : []
};
let meterDotFeatures = {
    type : "FeatureCollection",
    features : []
};

let geojson = {
    'type': 'FeatureCollection',
    'features': []
};

let distanceLine = {
    'type': 'Feature',
    'geometry': {
        'type': 'LineString',
        'coordinates': []
    }
};

let shpStyleList = {}

let distance = 0;

// 스냅 거리 설정 (단위: meters)
const snapDistance = 3;

let distancePopup;
let preDistancePopup;

let  debouncedPreDistance = debounce(preDistance, 5);
// let shpLoadFeatures = {
//     type : "FeatureCollection",
//     features : []
// };
const COORD_ROUND = 6;

// property check 확인
let isChecked;
let notChecked = []
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
const ICON_NODE_SRC = '/image/icon_node.png';

const EARTH_RADIUS = 6378137; // WGS-84

let matchLinkObj = {}
let matchObj = {}

let pageIdx = 0;
const itemsPerPage = 100; // 페이지당 항목 수
let totalPages = 0
let isAddNew = false

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

// 폴리곤
const POLYGON_FEATURE_ID = 'polygon-feature';
const POLYGON_LAYER_ID = 'polygon-layer';
const POLYGON_SOURCE_ID= 'polygon-source';

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

let isSaving = false;

let snapTargets = [];
const SNAP_DISTANCE = 7.5; // 스냅 거리 (미터)

// 타입 배열
let shpTypeArr = []

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
            var shpId = result.shpId;

            // $('.options').find()
            for (var i = 0; i < dataArr[filename].data.features.length; i++) {
                saveFeature(shpId, dataArr[filename].data.features[i], (i+1));
            }

            var html = ""
            html = "<a href='#' data-table-name=\""+filename+"\" onclick='getShpData("+shpId+")'>"+filename+
                '<span class="option-selected" data-bs-placement="right" data-bs-toggle="tooltip" title="불러온 파일" style="display: inline;"><i class="fas fa-check" aria-hidden="true"></i></span>'+
                "</a>"
            $('.options').append(html)

            toastOn("레이어가 DB에 저장되었습니다.");

            if (!tNameArr.includes(fileName)) {
                tNameArr.push(fileName);
                $(obj).find("span:eq(1)").show();

                appendToLayerOption(fileName)

                toastOn("DB에서 "+ fileName + " 을(를) 불러옵니다.")
            } else {
                tNameArr = tNameArr.filter(function(item) {
                    return item !== fileName;
                });
                delete shpTypeArr[fileName]
                $(obj).find("span:eq(1)").hide();
                $("#TR_"+fileName).remove()

                toastOn("지도에서 "+ fileName + " 을(를) 숨깁니다.")
            }
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
    let fileName = $(obj).find("span:eq(0)").text();

    // DB에서 불러올 명단에 추가
    if (!tNameArr.includes(fileName)) {
        // $.ajax({
        //     url : '/api/getShpStyle',
        //     type : 'POST',
        //     data : {
        //         fileName : fileName
        //     },
        //     success : function (data){
        //         if (!shpStyleList[fileName]) {
        //             shpStyleList[fileName] = {};
        //         }
        //
        //         shpStyleList[fileName]['shpType'] = data.shpType
        //         shpStyleList[fileName]['color'] = data.color.COLOR
        //         shpStyleList[fileName]['weight'] = data.weight.WEIGHT
        //         shpStyleList[fileName]['fontColor'] = data.fontColor.FONT_COLOR
        //         shpStyleList[fileName]['fontSize'] = data.fontSize.FONT_SIZE
        //     },
        //     error : function (error){
        //         console.log(error)
        //     }
        // })
        tNameArr.push(fileName);
        $(obj).find("span:eq(1)").show();

        appendToLayerOption(fileName)

        toastOn("DB에서 "+ fileName + " 을(를) 불러옵니다.")
    } else {
        tNameArr = tNameArr.filter(function(item) {
            return item !== fileName;
        });
        delete shpTypeArr[fileName]
        delete shpStyleList[fileName]
        $(obj).find("span:eq(1)").hide();
        $("#TR_"+fileName).remove()

        if ($("#TR_LINK").length === 0) {
            $("#empty-layerOption").show();
        }

        toastOn("DB에서 "+ fileName + " 을(를) 숨깁니다.")
    }

    // 기본 라벨 정의 key : value 로 임시 값 부여
    tNameLabelArr[fileName] = "";

    // 불러올 DB TABLE 을 선택. 지도 레벨이 일정 수준이 될때 정보를 표출
    updateMapData();
}

function getPolygonData(obj) {
    // 레이어가 없을 때만 추가
    if (!map.getLayer(POLYGON_LAYER_ID)) {
        // 기본 Feature 추가
        setSource(POLYGON_SOURCE_ID, polygonFeatures);
        // 폴리곤 레이어 추가
        setLayerTypePolygon(POLYGON_LAYER_ID, POLYGON_SOURCE_ID);
    }

    let fileName = $(obj).find("span:eq(0)").text();

    let targetObj = $(obj).find("span:eq(1)");

    if (targetObj.is(":visible")) {
        // 선택 해제
        // 소스에서 제거 필요
        polygonFeatures.features = [];
        map.getSource(POLYGON_SOURCE_ID).setData(polygonFeatures);

        targetObj.hide();
    } else {
        viewLoading()
        // 선택
        // 소스에서 추가하여 보이게
        let data = {
            fileName : fileName,
        }
        $.ajax({
            url : '/api/getPolygonData',
            type : 'POST',
            data : JSON.stringify(data),
            dataType: "json",
            contentType: 'application/json',
            success : function (result){
                console.log(result);
                Object.entries(result).forEach(([key, value]) => {
                    if (key !== "message") {
                        let geoJson = JSON.parse(result[key]);
                        geoJson.features.forEach(function(feature) {
                            if ($("#isShow_"+feature.properties.FILE_NAME).is(":checked")) {
                                feature.properties.label = feature.properties[feature.properties.LABEL_COLUMN];
                            } else {
                                feature.properties.label = "";
                            }

                            polygonFeatures.features.push(feature);
                        });

                        map.getSource(POLYGON_SOURCE_ID).setData(polygonFeatures);
                    }
                });

                targetObj.show();

                finishLoading()
            },
            error : function (error){
                console.log(error)
            }
        })
    }
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

    var iframe = $("#shpFrame")[0];

    var iframeDocument = iframe.contentWindow.document;

    var fileInput = $(iframeDocument).find("input[name='shpData']")[0];

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

    iframe.contentWindow.sendFiles(false);
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

        $(".empty-layer").show();

        $("#all-check").hide();
        $(".paging-container").hide();
    }

    isEmptyLayerList()

    toastOn("레이어를 삭제했습니다.")
}
function editShp(property, type) {
    // 맵에서 데이터를 가져옴
    var geoData = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features;

    // 기존 Draw 도형 숨기기
    $('.mapboxgl-gl-draw_line, .mapboxgl-gl-draw_point, .mapboxgl-gl-draw_combine, .mapboxgl-gl-draw_uncombine').hide();

    // Draw에 존재하는 도형을 geoData에 추가 후 Draw 비우기
    if (draw.getAll().features.length > 0) {
        draw.getAll().features.forEach(feature => {
            delete feature.id; // ID 제거
            geoData.push(feature);
        });
        draw.deleteAll();
    }

    // geoData 배열에서 주어진 속성의 ID와 일치하는 항목 제거
    for (var i = 0; i < geoData.length; i++) {
        if (geoData[i].properties[type] === property.properties[type]) {
            geoData.splice(i, 1); // 도형 제거
            break;
        }
    }

    // 주어진 속성의 새로운 도형을 Draw에 추가
    property.id = draw.getAll().features.length + 1; // 임시 ID 부여
    const newFeatureIds = draw.add(property);

    // 추가된 도형을 선택 상태로 변경
    draw.changeMode('simple_select', {
        featureIds: newFeatureIds.map(f => f)
    });

    // 스냅 대상을 업데이트
    updateSnapTargets();

    // 맵의 소스 데이터 업데이트
    map.getSource(LINK_NODE_STATION_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: geoData
    });

    saveState();
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
        map.setFilter(LINK_LAYER_ID + '-highlighted', ['==', 'id', '']);
        map.setFilter(NODE_LAYER_ID + '-highlighted', ['==', 'id', '']);
        startEditMode()
        $('.tab').hide()
        $('#tab3').show();
    } else if ( $('#btn-status').text() === '편집 모드') {
        hideAllTool();
        // 보기 모드로 전환
        startViewerMode()

        // 수정 내용삭제
        draw.deleteAll();

        // 히스토리 내역 초기화
        historyStack = [];

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
function handleFeatureSelection(e, layerId) {
    // 편집모드 클릭과 일반클릭을 분리
    // TODO 맵 클릭 시 링크 선 선택 해제 추가
    if (isEdit()) {
        if (e.features !== undefined) {
            // 이전 객체에 대한 히스토리 내역 초기화
            historyStack = [];

            // hideAllTool()
            let select = $('#type-select').val()
            selectedShp = e.features[0];
            selectedShp.id = 1;
            const featureType = selectedShp.geometry.type;
            const fileName = selectedShp.properties.FILE_NAME;

            let targetId = fileName + "_ID";
            // 수정대상 타입 구분
            if (select === 'lineString' && featureType.indexOf("LineString") > -1) {
                const property = findProperty(selectedShp.properties[targetId], targetId);
                if (property) {
                    editShp(property, targetId);
                }
                if (featureType === "MultiLineString") {
                    $("#link-btn-merge").show();
                }
            } else if (select === 'point' && featureType === 'Point' && selectedShp.properties.SHP_TYPE === "node") {
                const property = findProperty(selectedShp.properties[targetId], targetId);
                if (property) {
                    editShp(property, targetId);
                }
                $("#link-btn-merge").hide();
            } else if (select === 'station' && selectedShp.properties.SHP_TYPE === "station") {
                const property = findProperty(selectedShp.properties[targetId], targetId);
                if (property) {
                    editShp(property, targetId);
                }
                $("#link-btn-merge").hide();
            } else {
                // viewInfoWindow(e)
            }
        }
    } else {
        // 보기 모드 클릭 시 인포윈도우에 속성 정보 표시
        viewInfoWindow(e)
    }
}

function closePropertyWindow() {
    $('.property-window').css('left', '-500px')
    $("#tab-cancel").click();
}

function closeShpPropertyWindow() {
    $('.shp-property-window').css('right', '80px')
}

function closeLayerOptionWindow() {
    $('.layer-option-window').css('left', '-35%')
}

function openLayerOptionWindow() {
    if ($('.layer-option-window').css('left') == '10px') {
        closeLayerOptionWindow()
    } else {
        $('.layer-option-window').css('left', '10px')
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
    if (!map.getSource('geojson')) {
        map.addSource('geojson', {
            'type': 'geojson',
            'data': geojson
        });
    }
    if (!map.getLayer('measure-points')) {
        map.addLayer({
            id: 'measure-points',
            type: 'circle',
            source: 'geojson',
            paint: {
                'circle-radius': 5,
                'circle-color': 'rgb(255, 0, 142)'
            },
            filter: ['in', '$type', 'Point']
        });
    }
    if (!map.getLayer('measure-lines')) {
        map.addLayer({
            id: 'measure-lines',
            type: 'line',
            source: 'geojson',
            layout: {
                'line-cap': 'round',
                'line-join': 'round'
            },
            paint: {
                'line-color': 'rgb(255, 0, 142)',
                'line-width': 2.5
            },
            filter: ['in', '$type', 'LineString']
        });
    }

    map.on('click', drawDistance);
    map.on('contextmenu',updateMeasurement)
    map.on('mousemove',debouncedPreDistance)
}

// Debounce 함수
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}


// 거리 기능 미리보기
function preDistance(e) {
    const coordinates = [e.lngLat.lng, e.lngLat.lat];
    let lastFeature;

    if (geojson.features.length > 0) {
        if (preDistancePopup) {
            preDistancePopup.remove();
        }

        // 마지막 피처의 좌표를 가져옵니다.
        lastFeature = geojson.features.length === 1
            ? geojson.features[geojson.features.length - 1]
            : geojson.features[geojson.features.length - 2];

        let startCoord = lastFeature.geometry.coordinates;

        // startCoord의 구조 확인 및 변환
        if (Array.isArray(startCoord[0])) {
            // 다차원 배열에서 첫 번째 좌표를 선택
            startCoord = startCoord[0];
        }

        // startCoord이 배열 형태가 맞는지 확인합니다.
        if (Array.isArray(startCoord) && startCoord.length >= 2) {
            distanceLine.geometry.coordinates = [startCoord, coordinates];
        } else {
            console.error('Invalid startCoord format:', startCoord);
            return; // 오류가 발생하면 함수 종료
        }

        // 소스가 이미 존재하는 경우 업데이트, 그렇지 않으면 추가
        if (map.getSource('preview')) {
            map.getSource('preview').setData({
                'type': 'FeatureCollection',
                'features': [{
                    'type': 'Feature',
                    'geometry': {
                        'type': 'LineString',
                        'coordinates': distanceLine.geometry.coordinates
                    },
                    'properties': {}
                }]
            });
        } else {
            map.addSource('preview', {
                'type': 'geojson',
                'data': {
                    'type': 'FeatureCollection',
                    'features': [{
                        'type': 'Feature',
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': distanceLine.geometry.coordinates
                        },
                        'properties': {}
                    }]
                }
            });
        }

        // 레이어가 이미 존재하는 경우 업데이트, 그렇지 않으면 추가
        if (!map.getLayer('preview-line')) {
            map.addLayer({
                'id': 'preview-line',
                'type': 'line',
                'source': 'preview',
                'paint': {
                    'line-color': 'rgba(255, 0, 142, 0.5)', // 0.5 투명도 설정
                    'line-width': 2.5
                }
            });
        }

        // 거리 계산 및 팝업 업데이트
        const previewDistance = turf.length(distanceLine);
        let html = '거리 : <b style="color : rgba(255, 0, 142)">'
        html += previewDistance > 1 ? previewDistance.toFixed(1) + '</b>km' : (previewDistance * 1000).toFixed(1) + '</b>m';
        html += '<br>마우스 우클릭 시 <br>거리 측정이 종료됩니다'

        var popupOptions = {
            closeOnClick: false, // 클릭 시 닫히지 않음
            closeButton: false // 닫기 버튼 표시 안 함
        };

        preDistancePopup = new mapboxgl.Popup(popupOptions)
            .setLngLat(coordinates)
            .setHTML(html)
            .addTo(map);
    }
}

// 거리 측정을 그리는 함수
function drawDistance(e) {
    const features = map.queryRenderedFeatures(e.point, {
        layers: ['measure-points']
    });

    let html = ''

    // 포인트 컬렉션을 기반으로 라인 스트링을 새로 그리기 위해 기존의 라인 스트링 제거
    if (geojson.features.length > 1) geojson.features.pop();

    // 클릭된 피처가 있다면 맵에서 제거
    if (features.length) {
        const id = features[0].properties.id;
        geojson.features = geojson.features.filter(
            (point) => point.properties.id !== id
        );
    } else {
        const point = {
            'type': 'Feature',
            'geometry': {
                'type': 'Point',
                'coordinates': [e.lngLat.lng, e.lngLat.lat]
            },
            'properties': {
                'distance' : ''
            }
        };

        geojson.features.push(point);
    }

    if (geojson.features.length > 1) {
        distanceLine.geometry.coordinates = geojson.features.map(
            (point) => point.geometry.coordinates
        );

        geojson.features.push(distanceLine);

        distance = turf.length(distanceLine);

        if (distance > 1) {
            html =  distance.toFixed(1) + 'km'
        } else {
            html =  (distance * 1000).toFixed(1) + 'm'
        }

        geojson.features[geojson.features.length - 2].properties.distance = html;
    }


    map.getSource('geojson').setData(geojson);

    if (!map.getLayer('point-labels')) {
        map.addLayer({
            'id': 'point-labels',
            'type': 'symbol',
            'source': 'geojson',
            'layout': {
                'text-field': ['get', 'distance'],
                'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                'text-offset': [0, 1.25],
                'text-anchor': 'top'
            },
            'paint': {
                'text-color': 'rgb(255, 0, 142)'
            }
        });
    }
}

function updateMeasurement(e) {

    preDistancePopup.remove()
    map.off('mousemove',debouncedPreDistance)

    const coordinates = [e.lngLat.lng, e.lngLat.lat];


    let html = '총 거리 : <b style="color : rgba(255, 0, 142)">';

    var popupOptions = {
        closeOnClick: false, // 클릭 시 닫히지 않음
        closeButton: false // 닫기 버튼 표시
    };

    // 거리를 조건에 따라 km 또는 m 단위로 표시
    if (distance > 1) {
        html +=  distance.toFixed(1) + '</b>km<br><button class="endMeasurementBtn" onclick="endMeasurement()"><i class="fa-solid fa-eraser" style="margin-right: 5px"></i>지우기</button>'
    } else {
        html +=  (distance * 1000).toFixed(1) + '</b>m<br><button class="endMeasurementBtn" onclick="endMeasurement()"><i class="fa-solid fa-eraser" style="margin-right: 5px"></i>지우기</button>'
    }

    // 새로운 팝업 생성
    distancePopup = new mapboxgl.Popup(popupOptions)
        .setLngLat(coordinates)
        .setHTML(html)
        .addTo(map);
}

function endMeasurement() {
    // 팝업 제거
    distancePopup.remove();

    // geojson 객체 초기화
    geojson.features = []
    distance = 0
    map.getSource('preview').setData(geojson)
    map.getSource('geojson').setData(geojson)
    map.doubleClickZoom.enable();
    map.off('click', drawDistance);
    map.off('contextmenu',updateMeasurement)
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
    $("#tab3 > div.tab2-content > div.tool-content").show()
    $('#tab3 > div.tab2-content > div.tab2-section').hide()
    $(".tab-links").removeClass("active");
    $(".tab-menu > div:nth-child(1)").addClass("active");
    $("#tab3").hide();
    $("#tab1").show();
    $('.mapboxgl-ctrl-group').hide()
    $('#btn-status').text("보기 모드")
    $('#type-select-box').css('display', 'none');
    $("#type-select").val("none").prop("selected", true);

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
    toastOn("편집모드로 전환되었습니다.")
    $('#tab3 > div.tab2-content > div:nth-child(1)').hide()
    $(".tab-links").removeClass("active");
    $(".tab-menu > div:nth-child(3)").addClass("active");
    fileNm = $('.selected .file-tit').text()
    $('#btn-status').text("편집 모드")
    $('#type-select-box').css('display', 'block');
    var type = $($(".selected").find("i")[0]).attr("class")
    loadProperty = dataArr


    draw.changeMode('simple_select');
}

/// 편집으로 새로운거 추가되었을 때 이벤트 함수
function editCreate(e) {
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
}

let properties = {};
let isSavingFeature = false;
function addNewFeature() { // 버튼 클릭 시 입력 토대로 데이터에 내용이 추가됨
    isAddNew = true;
    properties = {};
    let fileName = $('#fileName').val();
    let property = $('#newpolygon .modal-body table').find('input');
    let proper = $('.property');
    let isProperty = true;
    let defaultLabel = $("#label_"+fileName + " option:selected").val();

    if (isProperty) {
        for (let i = 0; i < property.length; i++) {
            let name = $(property[i]).attr("attr");
            let value = $(property[i]).val();

            if (name) {
                properties[name] = value;
            }
        }

        $('#newpolygon').modal('hide');

        let shpType = $("#shpType").val();
        if (shpType === "link") {
            draw.changeMode('draw_line_string');
        } else if (shpType === "node" || shpType === "station") {
            draw.changeMode('draw_point');
        }

        properties["FILE_NAME"] = fileName;
        properties["SHP_TYPE"] = shpType;
        properties["LABEL_COLUMN"] = defaultLabel;

        map.on('draw.create', function (e) {
            console.log("create")

            const featureId = e.features[0].id;
            const allFeatures = draw.getAll().features;
            const feature = allFeatures.find(f => f.id === featureId);

            if (feature) {
                feature.properties = properties; // 속성 업데이트
                const featureType = feature.geometry.type;

                if (featureType.indexOf("LineString") > -1) {
                    properties["GEOMETRY"] = feature.geometry;
                    if (featureType === "MultiLineString") {
                        properties["F_LNG"] = feature.geometry.coordinates[0][0][0];
                        properties["F_LAT"] = feature.geometry.coordinates[0][0][1];
                        properties["T_LNG"] = feature.geometry.coordinates[0][feature.geometry.coordinates[0].length-1][0];
                        properties["T_LAT"] = feature.geometry.coordinates[0][feature.geometry.coordinates[0].length-1][1];
                    } else {
                        properties["F_LNG"] = feature.geometry.coordinates[0][0];
                        properties["F_LAT"] = feature.geometry.coordinates[0][1];
                        properties["T_LNG"] = feature.geometry.coordinates[feature.geometry.coordinates.length-1][0];
                        properties["T_LAT"] = feature.geometry.coordinates[feature.geometry.coordinates.length-1][1];
                    }
                } else if (featureType === "Point") {
                    properties["LNG"] = feature.geometry.coordinates[0];
                    properties["LAT"] = feature.geometry.coordinates[1];
                }

                draw.set({
                    type: 'FeatureCollection',
                    features: allFeatures
                });

                if (!isSavingFeature) {
                    isSavingFeature = true;
                    insertShpTable(feature);
                }
            }
        });

    }
}

function removeFeature() {
    if (selectedShp === undefined) {
        toastOn("선택된 객체가 없습니다. 객체 선택 후 진행해주세요.");
    } else {
        const fileName = selectedShp.properties.FILE_NAME;
        const featureId = selectedShp.properties[fileName + "_ID"];

        $.ajax({
            url : '/api/deleteShpFeatureData',
            type : 'POST',
            data : {
                fileName : fileName,
                featureId : featureId
            },
            success : function (result){
                if (result.result === "success") {
                    toastOn("선택하신 객체를 삭제하였습니다.");
                    // 성공 시 draw 내용을 비운다.
                    draw.deleteAll();
                } else {
                    toastOn("객체 삭제를 실패하였습니다.");
                }
            },
            error : function (error){
                console.log(error)
            }
        })
    }
}

function cancelAdd() { // 취소 버튼 눌렀을 때 그렸던 draw 내용 제거
    // var checkData= draw.getAll().features
    // for (i = 0; i < checkData.length; i++) {
    //     if (Object.keys(checkData[i].properties).length === 0) {
    //         draw.delete(checkData[i].id)
    //     }
    // }
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
            if (data && Object.keys(data).length > 0) {
                if (callback) callback(data);
            } else {
                // toastOn("지도에 표출할 정보가 없습니다. 상단의 이전 파일 불러오기에서 불러올 ShapeFile을 선택해주세요.");
            }
        },
        error : function(request, status, error) {
            toastOn("오류가 발생했습니다!" + "\n");
        },
    });
}

function setLinkNodeStationFeature() {
    return new Promise(async function(resolve, reject) {
        // 공통 features 초기화
        linkNodeStationFeatures.features = [];

        // sc파라미터 정의
        let params = {
            sc_NE_LNG: turf.round(map.getBounds()._ne.lng, COORD_ROUND),
            sc_NE_LAT: turf.round(map.getBounds()._ne.lat, COORD_ROUND),
            sc_SW_LNG: turf.round(map.getBounds()._sw.lng, COORD_ROUND),
            sc_SW_LAT: turf.round(map.getBounds()._sw.lat, COORD_ROUND),
        };

        // Promise 배열 생성
        let promises = [];

        // 파일별로 요청을 병렬 처리
        tNameArr.forEach(function(aName) {
            params["fileName"] = aName;
            let promise = new Promise(function(innerResolve, innerReject) {
                requestAjax(params, function(result) {
                    try {
                        Object.entries(result).forEach(([key, value]) => {
                            if (key !== "message") {
                                let geoJson = JSON.parse(result[key]);
                                geoJson.features.forEach(function(feature) {
                                    if ($("#isShow_"+feature.properties.FILE_NAME).is(":checked")) {
                                        feature.properties.label = feature.properties[feature.properties.LABEL_COLUMN];
                                    } else {
                                        feature.properties.label = "";
                                    }

                                    const lvlVal = $("#lvl_" + feature.properties.FILE_NAME + " option:selected").val();
                                    if (getMapZoom() >= lvlVal) {
                                        linkNodeStationFeatures.features.push(feature);
                                    }
                                });
                            }
                        });

                        innerResolve();
                    } catch (error) {
                        innerReject(error);
                    }
                }, function(error) {
                    innerReject(error);
                });
            });

            map.on('draw.create', updateSnapTargets); // Draw 피처 생성 후 스냅 대상을 업데이트
            map.on('draw.update', updateSnapTargets); // Draw 피처 업데이트 후 스냅 대상을 업데이트
            map.on('draw.delete', updateSnapTargets); // Draw 피처 삭제 후 스냅 대상을 업데이트
            map.on('draw.create', handleSnap); // 핸들 이동 시 스냅 적용
            map.on('draw.update', handleSnap); // 핸들 이동 시 스냅 적용

            promises.push(promise);
        });

        // 모든 요청이 완료될 때까지 기다림
        try {
            await Promise.all(promises);

            // 데이터 소스에 features 업데이트
            map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
            // addAttrList();

            // 레이어가 없을 때만 추가
            if (!map.getLayer(LINK_LAYER_ID) && !map.getLayer(METER_DOT_LAYER_ID)) {
                // 링크 레이어 추가
                setLayerTypeLine(LINK_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, LINK_FEATURE_ID, true);
                // 정류소 레이어 추가
                setLayerTypeIconAndLabel(STATION_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, STATION_FEATURE_ID, ICON_STATION_SRC);
                // 노드 레이어 추가
                setLayerTypeIconAndLabel(NODE_LAYER_ID, LINK_NODE_STATION_SOURCE_ID, NODE_FEATURE_ID, ICON_NODE_SRC);
                // 링크 거리별 포인트 레이어 추가
                setLayerLinkDot(METER_DOT_LAYER_ID, METER_DOT_SOURCE_ID);
                // 스냅 하이라이트 레이어 추가
                // addHighlightLayer()
            }

            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

function setSource(sourceId, features){
    map.addSource(sourceId, {
        type: 'geojson',
        data: features
    });
}

function setLayerTypeIconAndLabel(layerId, sourceId, featureId, symbolImage){
    map.addLayer({
        'id': layerId + '-highlighted',
        'type': 'circle',
        'source': sourceId,
        'paint': {
            'circle-color': '#1aa3ff',
            'circle-radius': 8,
            'circle-stroke-color': '#1aa3ff',
            'circle-stroke-width': 2
        },
        'filter': ['==', 'featureId', ''] // 초기 필터 비워두기
    });

    if (layerId == "station-layer") {
        map.loadImage(symbolImage, function (error, image) {
            if (error) throw error;
            map.addImage('icon-station', image);

            map.addLayer({
                'id': layerId,
                'type': 'symbol',
                'source': sourceId,
                'layout': {
                    'icon-image': 'icon-station',
                    'icon-size': 0.2,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-field':  ['get', 'label'],
                    'text-font': ['Open Sans Regular'],
                    'text-anchor': 'bottom',
                    'text-halo-color': '#ffffff', // 테두리 색상
                    'text-halo-width': 2, // 테두리 두께
                },
                'filter': ['==', 'featureId', featureId]
            });
        });
    } else {
        map.loadImage(symbolImage, function (error, image) {
            if (error) throw error;
            map.addImage('icon-node', image);

            map.addLayer({
                'id' : layerId,
                'type' : 'symbol',
                'source' : sourceId,
                'paint': {
                    'icon-color' : '#282828'
                },
                'layout': {
                    'icon-image': 'icon-node',
                    'icon-size': 0.2,
                    'icon-allow-overlap': true,
                    'icon-ignore-placement': true,
                    'text-field': ['get', 'label'],  // 레이블로 표시할 속성 이름
                    'text-font': ['Open Sans Regular'],
                    'text-anchor': 'bottom',
                    'text-offset': [0, -0.5],
                    'text-halo-color': '#ffffff', // 테두리 색상
                    'text-halo-width': 2, // 테두리 두께
                },
                'filter' : ['==', 'featureId', featureId]
            });
        });
    }

    map.on('click', layerId, function (e) {
        if (!isAddNew) {
            handleFeatureSelection(e, layerId);
        }
    });

    map.on('click', function(e) {
        if (!isEdit()) {
            const features = map.queryRenderedFeatures(e.point, {
                layers: [layerId]
            });

            if (features.length === 0) {
                // 없을 시 선택 취소
                map.setFilter(layerId + '-highlighted', ['==', '', '']);
            } else {
                // 선택 외 객체 스타일 리셋
                resetHighlightedLayerFilters()

                var clickedFeature = features[0];
                if (clickedFeature) {
                    let filterName = clickedFeature.properties.FILE_NAME;
                    // 선택된 피처를 강조하도록 필터 업데이트
                    if (map.getLayer(layerId + '-highlighted')) {
                        map.setFilter(layerId + '-highlighted', ['==', filterName + "_ID", clickedFeature.properties[filterName + "_ID"]]);
                    }
                }
            }
        }
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
            // && feature.properties.nodeId !== undefined
            if (feature.geometry.type === 'Point' ) {
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

    // 선택된 레이어를 강조하기 위한 레이어 추가
    map.addLayer({
        'id': layerId + '-highlighted',
        'type': 'line',
        'source': sourceId,
        'paint': {
            'line-color': '#1aa3ff',
            'line-width': 6
        },
        'filter': ['==', 'id', '']
    });
    // 기본 레이어
    map.addLayer({
        'id' : layerId,
        'type' : 'line',
        'source' : sourceId,
        'paint': {
            'line-color': '#888888',
            'line-width': 2
        },
        'filter' : ['==', 'featureId', featureId]
    });

    map.addLayer({
        'id': layerId+'label',
        'type': 'symbol',
        'source': sourceId,
        'layout': {
            'symbol-placement': 'line',
            'text-field': ['get', 'label'],
            'text-size': 12,
            'text-offset': [0, 0.5]
        },
        'paint': {
            'text-color': '#000000'
        }
    });

    map.on('click', layerId, function (e) {
        if (!isAddNew) {
            handleFeatureSelection(e, layerId);

            // 노드 shp 이 있을 경우 지근거리의 노드를 찾아서 로그로 표출
            let clickedFeature = e.features[0];
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
                // console.log('Closest start point node:', startPointNode);
                // console.log('Closest end point node:', endPointNode);

                if (!isEdit()) {
                    if (clickedFeature) {
                        // 선택 외 객체 스타일 리셋
                        if (!isSplitLinkNode) {
                            // resetHighlightedLayerFilters()
                        }

                        let filterName = clickedFeature.properties.FILE_NAME;
                        // 선택된 피처를 강조하도록 필터 업데이트
                        if (map.getLayer(layerId + '-highlighted')) {
                            map.setFilter(layerId + '-highlighted', ['==', filterName + "_ID", clickedFeature.properties[filterName + "_ID"]]);
                        }
                    } else {
                        map.setFilter(layerId + '-highlighted', ['==', '', '']);
                    }
                }
            }
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

function setLayerTypePolygon(layerId, sourceId) {
    // map.addLayer({
    //     'id' : layerId,
    //     'type' : 'fill',
    //     'source' : sourceId,
    //     'paint': {
    //         'fill-color': polygonColor,
    //         'fill-opacity': 0.5
    //     }
    // });
    map.addLayer({
        'id': layerId,
        'type': 'line',
        'source': sourceId,
        'layout': {},
        'paint': {
            'line-color': '#000',
            'line-width': 2,
        }
    });
}

function addHighlightLayer() {
    if (map.getLayer('snap-highlighted')) {
        map.removeLayer('snap-highlighted');
        map.removeSource('snap-highlighted');
    }

    map.addSource('snap-highlighted', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    map.addLayer({
        id: 'snap-highlighted',
        type: 'circle',
        source: 'snap-highlighted',
        paint: {
            'circle-color': '#FF0000', // 빨간색
            'circle-radius': 6, // 반지름
            'circle-stroke-width': 2, // 테두리 두께
            'circle-stroke-color': '#FFFFFF' // 흰색 테두리
        }
    });
}

function updateHighlightLayer(snapTargets) {
    const features = snapTargets.map(target => ({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: target
        },
        properties: {}
    }));

    // 하이라이트 소스 데이터 업데이트
    // map.getSource('snap-highlighted').setData({
    //     type: 'FeatureCollection',
    //     features: features
    // });
}

// 시작점과 끝점 사이에 segmentLength 미터 간격으로 점 생성
function generatePoints() {
    let minDistance = 1
    let segmentLength = $('#generateNumber').val()

    if (segmentLength > 0) {
        let coordinates;
        const targetFeature = draw.getAll().features[0];
        const featureType = targetFeature.geometry.type;

        // 선의 좌표 추출
        if (featureType === "MultiLineString") {
            coordinates = targetFeature.geometry.coordinates;
        } else if (featureType === "LineString") {
            coordinates = [targetFeature.geometry.coordinates]; // MultiLineString처럼 처리
        }

        const newFeatures = [];
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

        function createPointsFromCoordinates(coords) {
            let points = [];
            let currentPoint = coords[0];
            let remainingDistance = segmentLength;
            let accumulatedDistance = 0;
            points.push(currentPoint); // 첫 번째 점 추가

            for (let i = 1; i < coords.length; i++) {
                const nextPoint = coords[i];
                let segmentDistance = haversineDistance(currentPoint, nextPoint);

                // 첫 점과 다음 점 사이의 변수의 거리만큼 점 추가
                while (segmentDistance >= remainingDistance) {
                    const factor = remainingDistance / segmentDistance;
                    let newPoint = interpolatePoint(currentPoint, nextPoint, factor);

                    // 새로 생성된 점과 마지막으로 추가된 점 간의 거리 체크
                    if (points.length === 0 || haversineDistance(points[points.length - 1], newPoint) > minDistance) {
                        points.push(newPoint); // 새로 생성된 점 추가
                    }

                    accumulatedDistance += remainingDistance;
                    segmentDistance -= remainingDistance;
                    remainingDistance = segmentLength;
                    currentPoint = newPoint;
                }

                accumulatedDistance += segmentDistance;
                remainingDistance -= segmentDistance;
                currentPoint = nextPoint;
                points.push(currentPoint); // 다음 원래의 점 추가
            }

            // 마지막 점이 원래 선의 마지막 점과 일치하지 않으면 추가
            if (points[points.length - 1][0] !== coords[coords.length - 1][0] ||
                points[points.length - 1][1] !== coords[coords.length - 1][1]) {
                points.push(coords[coords.length - 1]);
            }

            return points;

        }
            // 각 LineString에 대해 점을 생성
        coordinates.forEach((lineCoords) => {
            let points = createPointsFromCoordinates(lineCoords);

            // 새로운 피처 객체 생성
            const newFeature = {
                type: 'Feature',
                id: Date.now(), // 임시아이디 부여 (현재 시간 사용)
                properties: { ...targetFeature.properties },
                geometry: {
                    type: 'LineString',
                    coordinates: points
                }
            };

            newFeatures.push(newFeature);
        });

            // MultiLineString 처리: 여러 LineString 피처를 하나의 MultiLineString으로 병합
        if (featureType === "MultiLineString") {
            // 기존 MultiLineString 피처의 모든 선을 포함한 새로운 MultiLineString 피처 생성
            const mergedFeature = {
                type: 'Feature',
                id: Date.now(), // 임시아이디 부여 (현재 시간 사용)
                properties: { ...targetFeature.properties },
                geometry: {
                    type: 'MultiLineString',
                    coordinates: newFeatures.map(f => f.geometry.coordinates)
                },
            };

            newFeatures.length = 0; // 기존 피처 배열을 비우고 병합된 피처를 추가
            newFeatures.push(mergedFeature);
        }

        // 기존 선택된 선을 삭제
        draw.deleteAll();

            // 새로운 피처를 Draw에 추가
        newFeatures.forEach((feature) => {
            const newFeatureIds = draw.add(feature);
            draw.changeMode('simple_select', {
                featureIds: newFeatureIds.map(f => f)
            });
        });

        saveState();
    } else {
        toastOn('0보다 큰 수는 입력 할수 없습니다')
    }
}


function getClosestLinkId(pointPos){
    //점과 선의 거리 중에서 가장가까운 link Id 찾기
    let closestId;
    let closestDist;
    let closestPointFeature;
    let clickPointFeature = turf.point(pointPos);

    for (let linkFeature of linkNodeStationFeatures.features) {
        if (linkFeature.properties.featureId === LINK_FEATURE_ID) {
            // MultiLineString일 경우 각 LineString을 개별적으로 처리
            if (linkFeature.geometry.type === 'MultiLineString') {
                for (let line of linkFeature.geometry.coordinates) {
                    let tmpFeature = {
                        type: 'Feature',
                        geometry: {
                            type: 'LineString',
                            coordinates: line
                        }
                    };
                    let tmpDist = turf.pointToLineDistance(clickPointFeature, tmpFeature);

                    if (!closestDist || closestDist > tmpDist) {
                        closestDist = tmpDist;
                        closestId = linkFeature.properties.linkId;
                        closestPointFeature = turf.nearestPointOnLine(tmpFeature, clickPointFeature);
                    }
                }
            } else if (linkFeature.geometry.type === 'LineString') {
                let tmpDist = turf.pointToLineDistance(clickPointFeature, linkFeature);

                if (!closestDist || closestDist > tmpDist) {
                    closestDist = tmpDist;
                    closestId = linkFeature.properties.linkId;
                    closestPointFeature = turf.nearestPointOnLine(linkFeature, clickPointFeature);
                }
            }
        }
    }

    let selectMeter;

    //줌 레벨별로 광범위 수준 정도 확대
    if(getMapZoom() <= 14){
        selectMeter = 10;
    }else if(getMapZoom() <= 15){
        selectMeter = 7.5;
    }else{
        selectMeter = 5;
    }

    if (isEdit()) {
        // 수정모드일때 선택 범위를 좀더 좁게하여 선택을 섬세하게 하기위한
        selectMeter = Math.floor(selectMeter / 2);
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

function initBasicTileSet() {
    // 맵박스 초기화
    map = new mapboxgl.Map({
        container: "map",
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [126.88271541564299, 37.48151056694073],
        zoom: 14,
    });
    map.dragRotate.disable();
    map.touchZoomRotate.disableRotation();

    map.addControl(language);
    map.addControl(draw, 'bottom-left');

    var info = document.getElementById('mouse_info');
    // 마우스 이동 이벤트 리스너
    map.on('mousemove', function(e) {
        var coords = e.lngLat;
        var zoom = map.getZoom().toFixed(2);
        info.innerHTML = '<span>위도: ' + coords.lat.toFixed(4) + '</span><br><span>경도: ' + coords.lng.toFixed(4) + '</span><br><span>줌 레벨: ' + zoom + '</span>';
    });

    // 줌 이벤트 리스너
    map.on('zoom', function() {
        var coords = map.getCenter();
        var zoom = map.getZoom().toFixed(2);
        info.innerHTML = '<span>위도: ' + coords.lat.toFixed(4) + '</span><br><span>경도: ' + coords.lng.toFixed(4) + '</span><br><span>줌 레벨: ' + zoom + '</span>';
    });

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
            updateMapData();
        });

        let isHandlingClick = false;
        map.on('click', (e) => {
            if (isHandlingClick) return;

            isHandlingClick = true;

            try {
                // 만약 핸들 포인트 window 가 켜져있다면 종료
                pointPopup.remove();

                if (map.getLayer(LINK_LAYER_ID) !== undefined) {
                    let features;
                    // 일반 선택과 편집모드의 선택 구분 분할
                    if (isEdit()) {
                        // 편집 모드일 때 선택된 타입에 따라 처리
                        const select = $('#type-select').val();

                        // 선택된 레이어에서 클릭된 피처 쿼리
                        switch (select) {
                            case 'lineString':
                                features = map.queryRenderedFeatures(e.point, { layers: [LINK_LAYER_ID] });
                                break;
                            case 'station':
                                features = map.queryRenderedFeatures(e.point, { layers: [STATION_LAYER_ID] });
                                break;
                            case 'point':
                                features = map.queryRenderedFeatures(e.point, { layers: [NODE_LAYER_ID] });
                                break;
                            default:
                                features = [];
                        }

                        // 클릭된 피처가 있을 경우 클릭 이벤트 처리 중지
                        if (features.length > 0) {
                            return;
                        }

                        // 클릭된 위치에서 가장 가까운 링크 찾기
                        const pointPos = getClosestLinkId([e.lngLat.lng, e.lngLat.lat]);

                        // 가장 가까운 링크가 없으면 종료
                        if (!pointPos) {
                            return;
                        }

                        // 가장 가까운 링크 위치에서 클릭 이벤트 트리거
                        map.fire('click', {
                            lngLat: pointPos,
                            point: map.project(pointPos)
                        });

                    } else {
                        // 일반모드일때 선택 최적화 적용
                        features = map.queryRenderedFeatures(e.point, {
                            layers : [NODE_LAYER_ID, STATION_LAYER_ID, LINK_LAYER_ID, ]
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
                    }
                }
            } finally {
                isHandlingClick = false;
            }
        });

        map.on('contextmenu', (e) => {
            if (isEdit()) {
                pointPopup.remove();

                const allFeatures = draw.getAll().features;
                const closestFeature = allFeatures[0];

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
            if (map.getLayer(STATION_LAYER_ID) !== undefined && map.getLayer(NODE_LAYER_ID) !== undefined) {
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

        map.on('draw.create', saveState);
        map.on('draw.update', saveState);
        map.on('draw.delete', saveState);
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
        if (aData.properties.SHP_TYPE === 'link') {
            // 링크 처리
            // 링크선 가운데 값 추출
            let lng, lat;
            if (aData.geometry.type === "MultiLineString") {
                const multiLine = aData.geometry.coordinates[0];
                const midIndex = Math.floor(multiLine.length / 2);
                lng = multiLine[midIndex][0];
                lat = multiLine[midIndex][1];
            } else if (aData.geometry.type === "LineString") {
                const line = aData.geometry.coordinates;
                const midIndex = Math.floor(line.length / 2);
                lng = line[midIndex][0];
                lat = line[midIndex][1];
            }
            linkHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\'' + lng + ',' + lat + '\', \''+aData.properties.SHP_TYPE+'\')">'
            linkHtml += '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>'
            linkHtml += '<div class="file-info">'
            linkHtml += '<div class="file-tit">' + aData.properties[aData.properties.LABEL_COLUMN] +'</div>'
            linkHtml += '</div>'
            linkHtml += '</div>'
        } else if (aData.properties.SHP_TYPE === 'node') {
            // 노드 처리
            nodeHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\''+aData.geometry.coordinates[0]+","+aData.geometry.coordinates[1]+'\', \''+aData.properties.SHP_TYPE+'\')">'
            nodeHtml += '<i class="fa-brands fa-hashnode" aria-hidden="true"></i>'
            nodeHtml += '<div class="file-info">'
            nodeHtml += '<div class="file-tit">' + aData.properties[aData.properties.LABEL_COLUMN] +'</div>'
            nodeHtml += '</div>'
            nodeHtml += '</div>'
        } else if (aData.properties.SHP_TYPE === 'station') {
            // 정류소 처리
            stationHtml += '<div class="layer-file basic-font" onclick="moveThenClick(\''+aData.geometry.coordinates[0]+","+aData.geometry.coordinates[1]+'\', \''+aData.properties.SHP_TYPE+'\')">'
            stationHtml += '<i class="fas fa-bus"></i>'
            stationHtml += '<div class="file-info">'
            stationHtml += '<div class="file-tit">' + aData.properties[aData.properties.LABEL_COLUMN] +'</div>'
            stationHtml += '</div>'
            stationHtml += '</div>'
        }
    }

    nodeList.append(nodeHtml);
    linkList.append(linkHtml);
    stationList.append(stationHtml);
}

function addShpList() {
    totalPages = Math.ceil(loadData.data.features.length / itemsPerPage);

    if (pageIdx <= 0 || isNaN(pageIdx)) {
        pageIdx = 0
    }

    if (notChecked.length > 0) {

    }

    let target = $(".layer-file-list");
    // 속성리스트 초기화
    target.find("div.layer-file").remove()
    target.find(".empty-layer").hide()

    // 속성 전체 리스트 선택값 초기화
    if ($('#all-check').text() !== '전체 선택') {
        shpListAllChecked()
    }

    // 현재 페이지의 시작 인덱스와 끝 인덱스 계산
    let startIdx = pageIdx * itemsPerPage;
    let endIdx = startIdx + itemsPerPage;
    endIdx = endIdx > loadData.data.features.length ? loadData.data.features.length : endIdx;

    shpPropertyAllChecked()

    if (startIdx > endIdx) {
        startIdx = (totalPages-1) * 100;
    }

    // 리스트 재생성
    let html = "";
    for (let i = startIdx; i < endIdx; i++) {
        let aData = loadData.data.features[i];
        if (aData.properties.isChecked === undefined) {
            aData.properties.isChecked = false
        }

        const type = aData.geometry.type

        // 타입별 데이터 표출 분류
        html += '<div class="layer-file basic-font" >'
        if (type.indexOf('LineString') > -1) {
            // 링크 처리
            if (aData.properties.isChecked === true || isAllChecked === true && !notChecked.includes(i)) {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_link" onchange="shpPropertyCheck('+i+')" checked>'
            } else {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_link" onchange="shpPropertyCheck('+i+')">'
            }
            html += '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>'
            html += '<div class="file-info">'
            html += '<div class="file-tit" onclick="shpPropertyDetail('+i+')">' + aData.properties[matchObj.label] + '</div>'
            html += '</div>'
            html += '</div>'
        } else if (type.indexOf('Point') > -1) {
            // 노드 처리
            if (aData.properties.isChecked === true || isAllChecked === true && !notChecked.includes(i)) {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_node" onchange="shpPropertyCheck('+i+')" checked>'
            } else {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_node"  onchange="shpPropertyCheck('+i+')">'
            }
            html += '<i class="fa-brands fa-hashnode" aria-hidden="true"></i>'
            html += '<div class="file-info">'
            html += '<div class="file-tit" onclick="shpPropertyDetail('+i+')">' + aData.properties[matchObj.label] +'</div>'
            html += '</div>'
            html += '</div>'
        } else {
            // 폴리곤 처리
            if (aData.properties.isChecked === true || isAllChecked === true && !notChecked.includes(i)) {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_polygon" onchange="shpPropertyCheck('+i+')" checked>'
            } else {
                html += '<input class="isCheck'+i+'" type="checkbox" name="selected_polygon"  onchange="shpPropertyCheck('+i+')">'
            }
            html += '<i class="fa-solid fa-draw-polygon" aria-hidden="true"></i>'
            html += '<div class="file-info">'
            html += '<div class="file-tit" onclick="shpPropertyDetail('+i+')">' + aData.properties[matchObj.label] +'</div>'
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
    if (isAllChecked && notChecked.length === 0) {
        $('#all-check').text('전체 취소')
    } else  {
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
        for (j = 0; j < notChecked.length; j++) {
            if (notChecked[j] === i) {
                notChecked.splice(j, 1)
            }
        }
        shpPropertyAllChecked()
    } else {
        loadData.data.features[i].properties.isChecked = false;
        let index = shpDataIdxArr.indexOf(i);
        if (index !== -1) {
            shpDataIdxArr.splice(index, 1);
        }
        notChecked.push(i)
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
        notChecked = []
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

    if (pageIdx > totalPages ) {
        pageIdx = totalPages
    }

    if (pageIdx+1 > totalPages) {
        pagingHtml += '<span>페이지 <input id="pageCount" type="text" value="' +pageIdx+'"> / ' + totalPages + '</span>';
    } else {
        pagingHtml += '<span>페이지 <input id="pageCount" type="text" value="' + (pageIdx+1) +'"> / ' + totalPages + '</span>';
    }

    if (pageIdx < totalPages - 1) {
        pagingHtml += '<button class="next-page">다음</button>';
    }
    pagingHtml += '</div>';

    $('.paging-container').html(pagingHtml);

    // 페이지 숫자 입력 시 해당 페이지 이동 함수
    $('#pageCount').on('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // 기본 동작 방지
            pageIdx = Number($('#pageCount').val())-1
            addShpList();
        }
    });
}

function moveThenClick(geo, type) {
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
    $(".attr-frm").empty();
    const shpType = loadData.data.features[0].geometry.type
    let optionHtml = '</ul>';

    //select 버튼 생성
    for (const key in loadData.data.features[0].properties) {
        if (loadData.data.features[0].properties[key] === '') {
            optionHtml += '<li class="property-item" onclick="selectPropertyBtn(this)">'+key+'</li>';
        } else {
            optionHtml += '<li class="property-item" onclick="selectPropertyBtn(this)">'+key+' <p class="property-example">예) '+loadData.data.features[0].properties[key]+'</p></li>';
        }
    }

    optionHtml += '</ul>';
    $('#property-select').append(optionHtml)
    $('.attr-frm').show()

    // 완료 후 모달 표출
    $("#modal_attr").modal('show');
}

function selectPropertyBtn(e) {
    $('.property-item').removeClass(' selected2');
    $('.property-example').css('color', '#b2b2b2');

    $(e).addClass('selected2')
    $(e.children).css('color', 'white');
}
function saveToMatchObject() {
    matchObj.label = $('.property-item.selected2').first().contents().filter(function() {
        return this.nodeType === 3; // 텍스트 노드를 필터링합니다.
    }).text().trim();

    // 모달 내용 초기화
    $("#modal_attr").modal('hide');

    $("#select_link_id").find("option").remove();
    $("#select_road_nm").find("option").remove();
    $("#select_node_id").find("option").remove();
    $("#select_crossroad_nm").find("option").remove();
    $('#all-check').css('display', 'block')
    $('.layer-file-list').css('height', 'calc(100% - 150px)')
    toastOn("정상적으로 불러왔습니다.")

    // 정보 매칭이 완료되었으면 SHP 리스트에 정보 표출
    addShpList()
}

function updateFeature() {
    // 변경된 features를 가져옵니다.
    if (draw.getAll().features.length > 1) {
        let featureList = []
        for (let i = 0; i < draw.getAll().features.length; i++) {
            let aFeature = draw.getAll().features[i];
            let featureType = aFeature.geometry.type;
            if (featureType.indexOf("LineString") > -1) {
                featureList.push(aFeature)
            }
        }

        const data = {
            feature: featureList
        };

        $.ajax({
            url : '/api/saveSplitLine',
            type : 'POST',
            async : true,
            DataType : "JSON",
            contentType: "application/json",
            data : JSON.stringify(data),
            success : function (result){
                console.log(result)
                if (result.result == 'success') {
                    // 정상 저장 후 화면 갱신
                    draw.deleteAll();
                    setLinkNodeStationFeature();

                    toastOn("정상적으로 수정되었습니다.")
                } else {
                    toastOn("정보 수정에 실패하였습니다.")
                }
            },
            error : function (error){
                console.log(error)
            }
        })
    } else {
        let feature = draw.getAll().features[0];
        if (feature === undefined) {
            toastOn("선택된 객체가 없습니다. 객체 선택 후 다시 시도해주세요.")
        } else {
            // feature의 타입을 구분합니다.
            let type = feature.properties.SHP_TYPE;

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
                    if (result.result == 'success') {
                        // 정상 저장 후 화면 갱신
                        draw.deleteAll();
                        setLinkNodeStationFeature();

                        toastOn("정상적으로 수정되었습니다.")
                    } else {
                        toastOn("정보 수정에 실패하였습니다.")
                    }
                },
                error : function (error){
                    console.log(error)
                }
            })
        }
    }
}

function splitLine() {
    let coordinates;
    // 선택한 선의 좌표 가져오기
    const targetFeature = draw.getAll().features[0];
    const featureType = targetFeature.geometry.type;

    if (featureType === "MultiLineString") {
        coordinates = draw.getAll().features[0].geometry.coordinates;
    } else if (featureType === "LineString") {
        coordinates = [draw.getAll().features[0].geometry.coordinates];
    }

    const newCoordinates = [];

    // 각 라인에 대해 분할 처리
    coordinates.forEach(lineCoords => {
        // 선을 분할할 중간 지점 계산
        if (lineCoords.length == 2) {
            const midPoint = [
                (lineCoords[0][0] + lineCoords[1][0]) / 2,
                (lineCoords[0][1] + lineCoords[1][1]) / 2
            ];

            const part1Coords = [lineCoords[0], midPoint];
            const part2Coords = [midPoint, lineCoords[1]];

            newCoordinates.push(part1Coords);
            newCoordinates.push(part2Coords);
        } else {
            const midPointIndex = Math.floor((lineCoords.length - 1) / 2);
            const part1Coords = lineCoords.slice(0, midPointIndex + 1); // 첫 번째 선의 좌표
            const part2Coords = lineCoords.slice(midPointIndex);       // 두 번째 선의 좌표

            newCoordinates.push(part1Coords);
            newCoordinates.push(part2Coords);
        }
    });

    // linkId를 숫자로 변환하고 새로운 아이디 할당
    const originalLinkId = parseInt(draw.getAll().features[0].properties.linkId, 10);
    const newLinkIds = newCoordinates.map((_, index) => (originalLinkId + index).toString());

    // MapboxDraw에 추가할 새로운 MultiLineString 생성
    const multiLineStringFeature = {
        type: 'Feature',
        properties: {
            ...draw.getAll().features[0].properties, // 기존 선의 다른 속성 유지
            linkId: newLinkIds // 새로운 linkId 배열
        },
        geometry: {
            type: 'MultiLineString',
            coordinates: newCoordinates
        }
    };

    // 기존 선택된 선 삭제
    draw.deleteAll();

    // MapboxDraw에 새로운 선 추가와 동시에 선택
    const newFeatureIds = draw.add(multiLineStringFeature);
    draw.changeMode('simple_select', {
        featureIds: newFeatureIds.map(f => f)
    });

    $("#link-btn-merge").show();

    saveState();
}

function hideAllTool() {
    $("#link-tools").hide();
    $("#saveBtn").hide();
    $("#node-tools").hide();
    $("#station-tools").hide();
    $("#link-btn-merge").hide();
    $("#tab3 > div.tab2-content > div.tool-content").hide()
}
function showLinkTool() {
    hideAllTool();
    $("#link-tools").show();
    $("#saveBtn").show();
    $("#tab3 > div.tab2-content > .tab2-section").show()
}
function showNodeTool() {
    hideAllTool();
    $("#saveBtn").show();
    $("#node-tools").show();
}
function showStationTool() {
    hideAllTool();
    $("#saveBtn").show();
    $("#station-tools").show();
}

function createInfoWindowContent(lngLat) {
        let html = `
        <div style="display: flex">
            <span style="margin-left: -5px; cursor: pointer;">절점</span>
            <hr style="width: 70px; margin: 10px -5px 10px 5px;">
        </div>
        <div style="display: flex; gap: 5px; margin-top: 5px;">
            <button class="btn-add-point">추가</button>
            <button class="btn-remove-point">삭제</button> 
        </div>`;

        const container = document.createElement('div');
        container.style.marginTop = '10px';
        container.style.display = 'block';
        container.innerHTML = html;

        const handlePointText = container.querySelector('span');
        handlePointText.onclick = function() {
            addHandle(selectedFeature, lngLat);
            pointPopup.remove();
        };

        const addButton = container.querySelector('.btn-add-point');
        addButton.onclick = function() {
            addHandle(selectedFeature, lngLat);
            pointPopup.remove();
        };

        const removeButton = container.querySelector('.btn-remove-point');
        removeButton.onclick = function() {
            removeHandle(selectedFeature, lngLat);
            pointPopup.remove();
        };

        return container;
}

// 핸들 포인트 추가 함수
function addHandle(feature, lngLat) {
    const shpType = feature.geometry.type

    if (shpType ==="LineString") {
        let coordinates = feature.geometry.coordinates;
        const closestIndex = findClosestSegmentIndex(coordinates, lngLat);
        // 새로운 핸들 포인트를 추가
        coordinates.splice(closestIndex + 1, 0, [lngLat.lng, lngLat.lat]);
        feature.geometry.coordinates = coordinates;
    } else {
        let lines = feature.geometry.coordinates;
        let closestIndex = -1;
        let closestLineIndex = -1;
        let minDistance = Infinity;

        // 모든 LineString을 순회하여 가장 가까운 선과 인덱스를 찾음
        lines.forEach((line, lineIndex) => {
            const index = findClosestSegmentIndex(line, lngLat);
            const distance = pointToSegmentDistance(lngLat, [line[index], line[index + 1]]);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
                closestLineIndex = lineIndex;
            }
        });

        // 가장 가까운 선에 새로운 핸들 포인트를 추가
        let closestLine = lines[closestLineIndex];
        closestLine.splice(closestIndex + 1, 0, [lngLat.lng, lngLat.lat]);
        lines[closestLineIndex] = closestLine;
        feature.geometry.coordinates = lines;

        saveState()
    }

    // Draw 객체에서 피처를 업데이트
    draw.delete(feature.id);
    // draw.add(feature);
    const newFeatureIds = draw.add(feature);

    // 링크 점 삭제 바로 반영되게 업데이트 요청 실행
    // realTimeUpdateToDB(feature);

    draw.changeMode('simple_select', {
        featureIds: newFeatureIds.map(f => f)
    });
}

// 핸들 포인트 삭제 함수
function removeHandle(feature, lngLat) {
    const shpType = feature.geometry.type

    if (shpType ==="LineString") {
        const coordinates = feature.geometry.coordinates;
        const closestIndex = findClosestPointIndex(coordinates, lngLat);
        // 가장 가까운 핸들 포인트를 삭제
        coordinates.splice(closestIndex, 1);
        feature.geometry.coordinates = coordinates;
    } else {
        const lines = feature.geometry.coordinates;
        let closestIndex = -1;
        let closestLineIndex = -1;
        let minDistance = Infinity;

        // 모든 LineString을 순회하여 가장 가까운 포인트와 인덱스를 찾음
        lines.forEach((line, lineIndex) => {
            const index = findClosestPointIndex(line, lngLat);
            const distance = pointToSegmentDistance(lngLat, [line[index], line[index]]);

            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
                closestLineIndex = lineIndex;
            }
        });

        // 가장 가까운 선에서 핸들 포인트를 삭제
        let closestLine = lines[closestLineIndex];
        closestLine.splice(closestIndex, 1);
        lines[closestLineIndex] = closestLine;
        feature.geometry.coordinates = lines;
    }

    // Draw 객체에서 피처를 업데이트
    draw.delete(feature.id);
    // draw.add(feature);
    const newFeatureIds = draw.add(feature);
    
    // 링크 점 삭제 바로 반영되게 업데이트 요청 실행
    // realTimeUpdateToDB(feature);

    draw.changeMode('simple_select', {
        featureIds: newFeatureIds.map(f => f)
    });

    saveState()
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

function uploadShpTable(flag) {
    if (loadData === undefined) {
        toastOn("불러온 SHP 파일이 없습니다!")
        return;
    }

    viewLoading();

    if (!isSaving) {
        isSaving = true;
        let selectedLabel = matchObj.label

        $.ajax({
            url : '/api/uploadShpTable',
            type : 'POST',
            data : {
                fileName : fileNm,
                idxArr: JSON.stringify(shpDataIdxArr),
                isAllChecked : isAllChecked,
                shpType : shpType,
                label: selectedLabel,
                confirmFlag : flag
            },
            success : function (result){
                if (result.result === "success") {

                    let html = '<div class="table-div" data-table-name="'+fileNm+'" onclick="getShpData(this)">'

                    let dataType = loadData.data.features[0].geometry.type;
                    if (dataType === 'Point') {
                        html += '<i class= "fa-brands fa-hashnode"aria-hidden="true"></i>'
                    } else if (dataType.indexOf("LineString") > -1) {
                        html += '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>'
                    } else {
                        html += '<i class="fa-solid fa-draw-polygon" aria-hidden="true"></i>'
                    }

                    html += '<span class="table-name">'+fileNm+'</span>'
                    html += '<span class="option-selected" data-bs-placement="right" data-bs-toggle="tooltip" aria-label="불러온 파일" data-bs-original-title="불러온 파일">'
                    html += '<i class="fas fa-check" aria-hidden="true"></i>'
                    html += '</span>'
                    html += '<div class="table-row"></div>'
                    html += '</div>'

                    clearShpList();

                    if ($("[data-table-name='"+fileNm+"']").length === 0) {
                        $(".attr-list").append(html);
                        $(".table-div:last-child").click();
                    } else {
                        if (!$("[data-table-name='"+fileNm+"']").find(".option-selected").is(":visible")) {
                            $("[data-table-name='"+fileNm+"']").click();
                        }
                    }

                    toastOn("성공적으로 저장되었습니다.");

                    $(".tab-links:eq(0)").click();

                } else if (result.message != "" || flag === false) {
                    // toastOn(result.message);
                    $("#modal_confirmFile").modal('show');
                }
                isSaving = false;

                finishLoading()
            },
            error : function (error){
                console.log(error)
                toastOn("파일 업로드 중 오류가 발생했습니다.");
                isSaving = false;
            }
        })
    } else {
        toastOn("현재 저장중인 파일이 있습니다. 잠시만 기다려주세요.");
    }
}

// ShapeFile 업로드 후 리스트를 비우는 로직
function clearShpList() {
    $(".layer-file-list").find(".layer-file").remove();

    $(".empty-layer").show();

    $("#all-check").hide();
    $(".paging-container").hide();

    isAllChecked = false
}

function appendToLayerOption(fileName) {
    $.ajax({
        url : '/api/getShpProperties',
        type : 'POST',
        data : {
            fileName : fileName
        },
        success : function (data){
            shpTypeArr[fileName] = data.shpType

            const defaultLabel = data.labelColumn.LABEL_COLUMN

            let html = '<tr id="TR_'+fileName+'">'
            html += '<td>'
            // 값 변화 감지 후 지도에 반영
            html += '<input id="isShow_'+fileName+'" class="show-layer" type="checkbox" checked onchange="updateMapData()">'
            html += '</td>'
            html += '<td>'+fileName+'</td>'
            html += '<td>'
            html += '<select id="lvl_'+fileName+'" class="select-box-zoom" onchange="updateMapData();">'
            html += '<option value="">선택</option>'
            html += '<option value="14" selected>14</option>'
            html += '<option value="16">16</option>'
            html += '<option value="18">18</option>'
            html += '<option value="20">20</option>'
            html += '</select>'
            html += '</td>'
            html += '<td>'
            html += '<select id="label_'+fileName+'" class="select-label" onchange="updateLabel(this)">'
            html += '<option value="emptyLabel">없음</option>'
            for (let i = 0; i < data.columnNames.length; i++) {
                let aColumn = data.columnNames[i]
                if (defaultLabel === aColumn) {
                    html += '<option value="'+aColumn+'" selected>'+aColumn+'</option>'
                } else {
                    html += '<option value="'+aColumn+'">'+aColumn+'</option>'
                }
            }
            html += '</select>'
            html += '</td>'
            html += '</tr>'

            $("#empty-layerOption").hide()
            $("#layerOptionList").append(html)
        },
        error : function (error){
            console.log(error)
        }
    })
}

function checkAttribute() {

}

function updateLabel(obj) {
    const fileName = $(obj).attr("id").replace("label_", "");
    const labelColumn = $(obj).find("option:selected").val()

    $.ajax({
        url : '/api/updateLabel',
        type : 'POST',
        data : {
            fileName : fileName,
            labelColumn : labelColumn
        },
        success : function (data){
            if (data.result === "success") {
                // 성공시 지도 정보 재호출
                updateMapData();
            } else {
                toastOn("파일의 라벨수정 중 에러가 발생했습니다.");
            }
        },
        error : function (error){
            console.log(error)
        }
    })
}

function updateMapData() {
    if(map.getZoom() >= 14){
        if (!isEdit()) {
            setLinkNodeStationFeature();
        }
    } else {
        linkNodeStationFeatures.features = [];
        map.getSource(LINK_NODE_STATION_SOURCE_ID).setData(linkNodeStationFeatures);
    }
}

function checkEditSelect() {
    hideAllTool()
    let select = $('#type-select').val();

    // 수정 내용삭제
    draw.deleteAll();

    // 히스토리 내역 초기화
    historyStack = [];

    // 수정 내용삭제 후 지도 정보 재로딩
    setLinkNodeStationFeature();

    if (select === 'lineString') {
        showLinkTool();
    } else if (select === 'point') {
        showNodeTool();
    } else if (select === 'station') {
        showStationTool();
    }
}

function addToFileModal() {
    const target = $(".shp-frm");
    target.find("li").remove();
    let type = $("#type-select").val()

    let optionHtml = '</ul>';
    if (type === 'point') {
        for (let i = 0; i < tNameArr.length; i++) {
            if (shpTypeArr[tNameArr[i]] === 'node') {
                optionHtml += '<li class="shp-item"  id="shp_'+tNameArr[i]+'" onclick="selectTargetShp(this);">'+tNameArr[i]+'</li>';
            }
        }
        optionHtml += '</ul>';
    } else if (type === 'lineString') {
        for (let i = 0; i < tNameArr.length; i++) {
            if (shpTypeArr[tNameArr[i]] === 'link') {
                optionHtml += '<li class="shp-item"  id="shp_'+tNameArr[i]+'" onclick="selectTargetShp(this);">'+tNameArr[i]+'</li>';
            }
        }
        optionHtml += '</ul>';
    } else {
        for (let i = 0; i < tNameArr.length; i++) {
            optionHtml += '<li class="shp-item"  id="shp_'+tNameArr[i]+'" onclick="selectTargetShp(this);">'+tNameArr[i]+'</li>';
        }
    }

    target.append(optionHtml)
    $('.shp-frm').show()
}

function selectTargetShp(obj) {
    $(".shp-item").removeClass("selected2");
    $(obj).addClass("selected2");
}
function setTargetShp() {
    // 링크 9 개의 서비스 속성
    // 정류소, 노드 6개의 서비스 속성
    const targetShp = $("#shp-select").find(".selected2").text();

    $.ajax({
        url : '/api/getShpProperties',
        type : 'POST',
        data : {
            fileName : targetShp
        },
        success : function (data){
                const targetTable = $('#newpolygon .modal-body table tbody');
                targetTable.empty()

                let columnLength;
                $("#shpType").val(data.shpType)
                $("#fileName").val(targetShp)
                if (data.shpType === "link") {
                    columnLength = data.columnNames.length - 9;
                } else if (data.shpType === "node" || data.shpType === "station") {
                    columnLength = data.columnNames.length - 6;
                }

                for (let i = 0; i < columnLength; i++) {
                    var html = "<tr><td><label class='polygon-label' title="+data.columnNames[i]+">"+data.columnNames[i]+"</label></td><td><input class='property' attr='"+data.columnNames[i]+"' type='text'></td></tr>"
                    targetTable.append(html)
                }
                $('#newpolygon').modal('show')
        },
        error : function (error){
            console.log(error)
        }
    })
}

function openNewFeatureModal() {
    $('#modal_feature').modal('show');
    addToFileModal();
}

function insertShpTable(data) {
    $.ajax({
        url : '/api/insertShpTable',
        data : JSON.stringify(data),
        dataType: "json",
        contentType: 'application/json',
        type : 'POST',
        success : function (data){
            if (data.status === "success") {
                toastOn("새 객체가 추가되었습니다.");
                // changeEditMode()
                isAddNew = false;
                isSavingFeature = false;
            }
        },
        error : function (error){
            console.log(error)
        }
    })
}

function checkFile(fileName) {
    let isHasFile = false;
    const fileListItems = $(".options a");

    for (let i = 0; i <fileListItems.length; i++) {
        if ($(fileListItems[i]).find("span:eq(0)").text() === fileName) {
            isHasFile = true
        }
    }

    return isHasFile;
}

function mergeLines() {
    const feature = draw.getAll().features[0];
    const shpType = feature.geometry.type;

    if (shpType === "MultiLineString") {
        const lines = feature.geometry.coordinates;
        let mergedCoordinates = [];

        lines.forEach(line => {
            mergedCoordinates = mergeClosePoints(mergedCoordinates.concat(line));
        });

        feature.geometry.type = "LineString";
        feature.geometry.coordinates = mergedCoordinates;

        // Draw 객체에서 피처를 업데이트
        draw.delete(feature.id);
        const newFeatureIds = draw.add(feature);

        // realTimeUpdateToDB(feature);

        draw.changeMode('simple_select', {
            featureIds: newFeatureIds.map(f => f)
        });

        $("#link-btn-merge").hide();

        saveState();
    }
}

function mergeClosePoints(coordinates) {
    const mergedCoordinates = [];

    if (coordinates.length === 0) return mergedCoordinates;

    mergedCoordinates.push(coordinates[0]);

    for (let i = 1; i < coordinates.length; i++) {
        const lastPoint = mergedCoordinates[mergedCoordinates.length - 1];
        const currentPoint = coordinates[i];

        const distance = pointToPointDistance(lastPoint, currentPoint);

        if (distance > 10) {
            mergedCoordinates.push(currentPoint);
        }
    }

    return mergedCoordinates;
}

function pointToPointDistance(point1, point2) {
    const [lng1, lat1] = point1;
    const [lng2, lat2] = point2;

    const R = 6371e3; // 지구 반지름 (미터)
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in metres
    return distance;
}

function editProperties() {
    $(".property-text").hide()
    $(".property-input").show()

    startEdit();
}

function startEdit() {
    $("#tab-cancel").show()
    $("#tab-save").show()

    $("#tab-edit").hide();
}

function cancelEdit() {
    $(".property-text").show()
    $(".property-input").hide()

    $("#tab-edit").show();

    $("#tab-cancel").hide()
    $("#tab-save").hide()
}

const propertyFilter = ["emptyLabel","featureId","iconId","label"]
function saveProperties() {
    let newData = {}
    $(".property-list").find("input").each(function(index, item) {
        let key = $(item).attr("name");
        if (propertyFilter.indexOf(key) === -1) {
            newData[key] = $(item).val();
        }
    });

    $.ajax({
        url : '/api/updateProperties',
        type : 'POST',
        async : true,
        DataType : "JSON",
        contentType: "application/json",
        data : JSON.stringify(newData),
        success : function (result){
            // 정상 작동완료 시 처리 값을 최신화 시킴
            $(".property-list").find("input").each(function(index, item) {
                let key = $(item).attr("name");

                $(item).siblings("span").text(newData[key]);
            });
            cancelEdit();

            toastOn("속성이 정상적으로 변경되었습니다.");
        },
        error : function (error){
            console.log(error)
        }
    })
}

function saveState() {
    const features = draw.getAll().features;
    if (features.length > 0) {
        historyStack.push(JSON.parse(JSON.stringify(features[0]))); // Save a deep copy of the current state
    }
}

function undo() {
    if (historyStack.length > 0) {
        const previousState = historyStack.pop();
        draw.deleteAll();

        const newFeatureIds = draw.add(previousState);
        draw.changeMode('simple_select', {
            featureIds: newFeatureIds.map(f => f)
        });
    } else  {
        toastOn("초기상태입니다. 되돌릴 수 없습니다.")
    }
}

// 선택 객체 스타일 모두 해제
function resetHighlightedLayerFilters() {
    const layers = map.getStyle().layers.filter(layer => layer.id.includes('highlighted'));
    layers.forEach(layer => {
        map.setFilter(layer.id, ['==', '', '']);
    });
}

function cancelLoadFile() {
    fileNm = ""
    loadData = {}
    dataArr = {}
}

//
function getNearestNode(point, nodes, maxDistance) {
    let nearestNode = null;
    let minDistance = maxDistance;

    nodes.forEach(node => {
        const distance = turf.distance(point, node.geometry.coordinates, { units: 'meters' });
        if (distance < minDistance) {
            minDistance = distance;
            nearestNode = node;
        }
    });

    return nearestNode;
}

function viewInfoWindow(e) {
    if (e.features !== undefined) {
        $('.property-window').css('left', '10px'); // 속성 창 띄우기
        $('.property-window > .property-list > table').empty() // 속성 리스트 비우기

        const properties = e.features[0].properties;
        let propertyHtml = '<tbody>';
        for (const key in properties) {
            propertyHtml += '<tr><td id='+e.features[0].id+'>' + key +'</td>' +
                '<td class="property-info">' +
                '<span class="property-text">'+ properties[key] + '</span>' +
                '<input class="property-input" type="text" name="'+key+'" value="'+ properties[key] +'">' +
                '</td>' +
                '</tr>'; // 속성 정보
        }

        propertyHtml += '</tbody>';

        $('.property-window > .property-list > table').append(propertyHtml);
    }
}

let isSplitLinkNode = false;
function splitIntoNode() {
    if (draw.getAll().features[0] === undefined) {
        toastOn("선택된 노드가 없습니다.")
        return;
    }

    const nodeFeature = draw.getAll().features[0];
    const nodeCoordinates = nodeFeature.geometry.coordinates;

    // 사용자가 링크를 선택할 수 있는 기능
    function choiceLinks(callback) {
        toastOn("분할하실 선(링크)을 선택해주세요.");
        isSplitLinkNode = true;
        let targetLinks = [];
        let selectedLinkIds = new Set(); // 선택된 링크의 ID를 추적하는 Set

        // 링크 클릭 이벤트 핸들러 등록
        function onLinkClick(e) {
            const clickedLink = e.features[0];
            const fileName = clickedLink.properties.FILE_NAME; // 각 링크의 고유 ID를 사용
            const linkId = clickedLink.properties[fileName + "_ID"]; // 각 링크의 고유 ID를 사용

            // 이미 선택된 링크인지 확인
            if (selectedLinkIds.has(linkId)) {
                return; // 중복된 링크 클릭 시 무시
            }

            // 클릭한 링크를 리스트에 추가
            targetLinks.push(clickedLink);
            removeFromMap(clickedLink)
            selectedLinkIds.add(linkId);

            // 최대 두 개의 링크만 선택하도록 제한
            if (targetLinks.length >= 2) {
                map.off('click', LINK_LAYER_ID, onLinkClick); // 이벤트 핸들러 제거
                toastOn("선택하신 선(링크)으로 분할합니다.");
                isSplitLinkNode = false;
                callback(targetLinks); // 선택이 완료된 후 콜백 함수 호출
            }
        }

        map.on('click', LINK_LAYER_ID, onLinkClick);
    }

    // 수직으로 노드와 링크 인접점 계산
    function pointToLineDistance(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        const param = len_sq != 0 ? dot / len_sq : -1;

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

        return [xx, yy];
    }

    function processSelectedLinks(userSelectedLinks) {
        const features = draw.getAll().features;

        userSelectedLinks.forEach(link => {
            const linkFeature = features.find(f => f.id === link.id);
            if (!linkFeature) return;

            const linkId = link.id;
            const linkCoordinates = linkFeature.geometry.coordinates;

            // 노드에서 링크까지의 가장 가까운 점 계산
            let closestPoint = null;
            let minDistance = Infinity;

            for (let i = 0; i < linkCoordinates.length - 1; i++) {
                const [x1, y1] = linkCoordinates[i];
                const [x2, y2] = linkCoordinates[i + 1];
                const [px, py] = nodeCoordinates;
                const [closestX, closestY] = pointToLineDistance(px, py, x1, y1, x2, y2);

                const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = [closestX, closestY];
                }
            }

            // 링크를 분할하고 포인트 추가
            if (closestPoint) {
                const updatedCoordinates = [];
                let pointAdded = false;

                for (let i = 0; i < linkCoordinates.length - 1; i++) {
                    const [x1, y1] = linkCoordinates[i];
                    const [x2, y2] = linkCoordinates[i + 1];

                    // 기존 좌표 추가
                    updatedCoordinates.push([x1, y1]);

                    if (!pointAdded && ((x1 <= closestPoint[0] && closestPoint[0] <= x2) || (x2 <= closestPoint[0] && closestPoint[0] <= x1))) {
                        updatedCoordinates.push([x1, y1]);

                        const pointsAround = generatePointsAroundClosestPoint([x1, y1], [x2, y2], closestPoint, nodeCoordinates, 15.5);

                        updatedCoordinates.push(...pointsAround);
                        pointAdded = true;
                    }
                }

                // 마지막 좌표 추가
                updatedCoordinates.push(linkCoordinates[linkCoordinates.length - 1]);

                let nodeIdx = -1;
                for (let i = 0; i < updatedCoordinates.length; i++) {
                    if (updatedCoordinates[i] === nodeCoordinates) {
                        nodeIdx = i;
                    }
                }

                const firstPart = updatedCoordinates.slice(0, nodeIdx + 1);
                const secondPart = [nodeCoordinates, ...updatedCoordinates.slice(nodeIdx)];

                const multiLineString = {
                    type: 'MultiLineString',
                    coordinates: [
                        firstPart,
                        secondPart
                    ]
                };

                // 기존 링크 삭제
                draw.delete(linkId);

                // draw의 링크 피처 업데이트
                draw.add({
                    type: 'Feature',
                    geometry: multiLineString,
                    properties: linkFeature.properties // 기존 링크의 속성 유지
                });

                toastOn("지도에 생성된 링크를 추가로 알맞게 수정해주세요.")
            }
        });
    }

    // 사용자가 링크를 선택하도록 활성화하고, 선택 후 처리
    choiceLinks(processSelectedLinks);
}

function removeFromMap(feature) {
    let source = map.getSource(LINK_NODE_STATION_SOURCE_ID);
    let geoData = source._options.data.features;

    for (let i = 0; i < geoData.length; i++) {
        let fileName = feature.properties.FILE_NAME
        if (geoData[i].properties[fileName + "_ID"] === feature.properties[fileName + "_ID"]) {
            if (geoData[i].geometry.coordinates.length > 1) {
                feature.geometry.coordinates = geoData[i].geometry.coordinates
            } else {
                feature.geometry.coordinates = geoData[i].geometry.coordinates[0]
            }

            geoData.splice(i, 1); // 도형 제거
            break;
        }
    }

    // 주어진 속성의 새로운 도형을 Draw에 추기
    feature.id = draw.getAll().features.length + 1; // 임시 ID 부여
    draw.add(feature);

    // 맵의 소스 데이터 업데이트
    map.getSource(LINK_NODE_STATION_SOURCE_ID).setData({
        type: 'FeatureCollection',
        features: geoData
    });
}

// 두 지점 사이의 거리(미터)를 기준으로 새로운 좌표를 생성
function generatePointsAroundClosestPoint(start, end, closestPoint, nodeCoordinates, interval) {
    const distanceToStart = turf.distance(start, closestPoint, { units: 'meters' });
    const distanceToEnd = turf.distance(closestPoint, end, { units: 'meters' });

    const points = [];

    if (distanceToStart > interval) {
        // closestPoint의 전 10미터 지점 생성
        const pointBefore = turf.along(turf.lineString([start, closestPoint]), distanceToStart - interval, { units: 'meters' }).geometry.coordinates;
        points.push(pointBefore);
    }

    // closestPoint를 추가
    points.push(nodeCoordinates);

    if (distanceToEnd > interval) {
        // closestPoint의 후 10미터 지점 생성
        const pointAfter = turf.along(turf.lineString([closestPoint, end]), interval, { units: 'meters' }).geometry.coordinates;
        points.push(pointAfter);
    }

    return points;
}

function mergeIntoNode() {
    if (draw.getAll().features[0] === undefined) {
        toastOn("선택된 노드가 없습니다.")
        return;
    }

    const nodeFeature = draw.getAll().features[0];
    const nodeCoordinates = nodeFeature.geometry.coordinates;

    // 지도에 있는 모든 링크 피처 가져오기
    const linkFeatures = map.queryRenderedFeatures({layers: [LINK_LAYER_ID]});
    // const linkFeatures = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features

    let matchingLinks = [];
    const toleranceMeters = 20 ;

    function coordToString(coord) {
        return `${coord[0].toFixed(6)},${coord[1].toFixed(6)}`;
    }

    function calculateDistance(coord1, coord2) {
        const R = 6371e3; // 지구 반지름 (미터 단위)
        const lat1 = coord1[1] * Math.PI / 180;
        const lat2 = coord2[1] * Math.PI / 180;
        const deltaLat = (coord2[1] - coord1[1]) * Math.PI / 180;
        const deltaLng = (coord2[0] - coord1[0]) * Math.PI / 180;

        const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        // 미터 단위 거리
        return R * c;
    }

    function calculateMidPoint(coord1, coord2) {
        return [
            (coord1[0] + coord2[0]) / 2,
            (coord1[1] + coord2[1]) / 2
        ];
    }

    // 기준 노드의 반대편 마지막 좌표를 찾는 함수
    function findFarthestCoordinate(link, nodeCoordinates) {
        const linkCoordinates = link.geometry.coordinates;
        let maxDistance = -Infinity;
        let farthestCoordinate = null;

        for (let coord of linkCoordinates) {
            const distance = calculateDistance(coord, nodeCoordinates);
            if (distance > maxDistance) {
                maxDistance = distance;
                farthestCoordinate = coord;
            }
        }
        return farthestCoordinate;
    }

    // 좌표 목록에서 중복된 값을 제거하는 함수
    function removeDuplicateCoordinates(coords) {
        const uniqueCoords = new Set(coords.map(coordToString));
        return Array.from(uniqueCoords).map(coordStr => coordStr.split(',').map(Number));
    }

    function sortSquarePoints(squarePoints) {
        let center = squarePoints.reduce((acc, point) => {
            return [acc[0] + point[0], acc[1] + point[1]];
        }, [0, 0]).map(coord => coord / squarePoints.length);

        return squarePoints.sort((a, b) => {
            let angleA = Math.atan2(a[1] - center[1], a[0] - center[0]);
            let angleB = Math.atan2(b[1] - center[1], b[0] - center[0]);
            return angleA - angleB;
        });
    }

    const zoomLevel = map.getZoom();
    const minZoomLevel = 18; // 최소 줌 레벨 설정 (필요에 따라 조정)

    if (zoomLevel > minZoomLevel) {
        toastOn("줌 레벨이 너무 높아 병합 작업을 수행할 수 없습니다.");
        return;
    }
    const metersPerPixel = 156543.03392 * Math.cos(nodeCoordinates[1] * Math.PI / 180) / Math.pow(2, zoomLevel);
    const adjustedTolerance = toleranceMeters / metersPerPixel;

    // 각 링크를 순회하며 노드 좌표와 매우 가까운 링크를 찾음
    for (let link of linkFeatures) {
        if (link.geometry.type.indexOf("LineString") === -1) {
            continue;
        }

        let linkCoordinates // = link.geometry.coordinates;
        if (link.geometry.coordinates.length > 1) {
            linkCoordinates = link.geometry.coordinates;
        } else {
            linkCoordinates = link.geometry.coordinates[0];
        }

        const fileName = link.properties.FILE_NAME;
        const linkId = link.properties[fileName + "_ID"];

        if (matchingLinks.some(existingLink => existingLink.properties[fileName + "_ID"] === linkId)) {
            continue; // 이미 추가된 링크는 건너뛰기
        }

        // 링크의 좌표 중 노드 좌표와 매우 가까운 좌표를 찾기
        for (let coord of linkCoordinates) {
            const distance = calculateDistance(coord, nodeCoordinates);

            if (distance <= adjustedTolerance) {
                matchingLinks.push(link);
                break; // 일치하는 링크를 찾으면 내부 반복 종료
            }
        }
    }

    // 노드와 연결된 링크가 4개 이상인 경우 병합 진행
    if (matchingLinks.length === 4) {
        let linkSegments = [];
        let standardPoints = [];

        matchingLinks.forEach(link => {
            const linkCoordinates = link.geometry.coordinates;

            let closestIndex = -1;
            let minDistance = Infinity;

            // 노드와 가장 가까운 좌표의 인덱스를 찾기
            for (let i = 0; i < linkCoordinates.length; i++) {
                const distance = calculateDistance(linkCoordinates[i], nodeCoordinates);

                if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = i;
                }
            }

            // 가장 가까운 좌표의 전 또는 후의 좌표 정보를 추출하여 standardPoints에 저장
            if (closestIndex > 0) {
                standardPoints.push(linkCoordinates[closestIndex - 1]); // 전 인덱스 좌표
                linkCoordinates.splice(closestIndex, 1); // 전 인덱스 좌표 제거
            }
            if (closestIndex < linkCoordinates.length - 1) {
                standardPoints.push(linkCoordinates[closestIndex + 1]); // 후 인덱스 좌표
                linkCoordinates.splice(closestIndex, 1); // 후 인덱스 좌표 제거
            }

            // 링크의 시작과 끝을 추출
            if (linkCoordinates.length > 0) {
                linkSegments.push(linkCoordinates);
            }
        });

        if (linkSegments.length < 2) {
            toastOn("병합 가능한 링크가 충분하지 않습니다.");
            return;
        }

        // standardPoints에 있는 좌표들을 사용해 사각형을 구성할 점들 계산
        standardPoints = sortSquarePoints(standardPoints);
        // 정렬된 사각형을 닫으면서 모든 면의 중심점을 찾을 수 있게 첫번째 꼭지점 추가
        standardPoints.push(standardPoints[0])
        // 사각형 생성완료

        let squarePoints = [];

        // 좌표들 사이의 중간점을 계산하여 추가
        for (let i = 0; i < standardPoints.length - 1; i++) {
            let nextIndex = (i + 1) % standardPoints.length;
            let midPoint = calculateMidPoint(standardPoints[i], standardPoints[nextIndex]);
            squarePoints.push(midPoint);
        }
        // 좌표 중간점 활용 사각형 완료

        const oppositeEndCoordinates = matchingLinks.map(link => findFarthestCoordinate(link, nodeCoordinates));
        const uniqueOppositeEndCoordinates = removeDuplicateCoordinates(oppositeEndCoordinates);

        let pointsToRemove = [];
        uniqueOppositeEndCoordinates.forEach(endCoord => {
            let closestCoord = null;
            let minDistance = Infinity;

            squarePoints.forEach(point => {
                let distance = calculateDistance(endCoord, point);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCoord = point;
                }
            });

            // 가장 가까운 좌표를 삭제할 목록에 추가
            if (closestCoord) {
                pointsToRemove.push(closestCoord);
            }
        });

        // 중복 제거 후 실제 squarePoints에서 삭제
        const uniquePointsToRemove = removeDuplicateCoordinates(pointsToRemove);
        uniquePointsToRemove.forEach(coordToRemove => {
            squarePoints = squarePoints.filter(point => coordToString(point) !== coordToString(coordToRemove));
        });

        // 두 링크를 병합하는 로직 추가
        const closestLinks = findClosestLinksToSquarePoints(matchingLinks, squarePoints);
        const mergedLink1 = mergeLinks(closestLinks[0][0], closestLinks[0][1]);
        const mergedLink2 = mergeLinks(closestLinks[1][0], closestLinks[1][1]);

        let fileName = closestLinks[0][1].properties.FILE_NAME;

        closestLinks[0][0].properties.DELETE_ID = closestLinks[0][1].properties[fileName + "_ID"];
        closestLinks[1][0].properties.DELETE_ID = closestLinks[1][1].properties[fileName + "_ID"];
        let mergeData = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: mergedLink1
            },
            properties: closestLinks[0][0].properties
        }
        let mergeData2 = {
            type: "Feature",
            geometry: {
                type: "LineString",
                coordinates: mergedLink2
            },
            properties: closestLinks[1][0].properties
        }

        draw.add(mergeData)
        draw.add(mergeData2)

        // 기존 링크들 제거
        let source = map.getSource(LINK_NODE_STATION_SOURCE_ID);
        let geoData = source._options.data.features;
        geoData = geoData.filter(feature => {
            return !matchingLinks.some(link => {
                let fileName = link.properties.FILE_NAME;
                return feature.properties[fileName + "_ID"] === link.properties[fileName + "_ID"];
            });
        });

        map.getSource(LINK_NODE_STATION_SOURCE_ID).setData({
            type: 'FeatureCollection',
            features: geoData
        });

        toastOn("링크가 성공적으로 병합되었습니다.");
    } else if (matchingLinks.length > 4) {
        toastOn("근처 링크가 너무 많습니다. 교차로가 없는 노드를 선택하여 실행해주세요.");
    } else {
        toastOn("병합 가능한 링크를 찾지 못했습니다.");
    }

    // 두 링크를 찾고 병합하는 함수들
    function findClosestLinksToSquarePoints(links, squarePoints) {
        let closestLinkPairs = [];

        // 각 squarePoint에 대해 가장 가까운 두 링크를 찾기
        squarePoints.forEach(point => {
            let closestLink1 = null;
            let closestLink2 = null;
            let minDistance1 = Infinity;
            let minDistance2 = Infinity;

            links.forEach(link => {
                // 링크의 모든 좌표를 순회하여 기준 노드와 가장 가까운 좌표를 찾음
                let closestCoordInLink = null;
                let minDistanceInLink = Infinity;

                link.geometry.coordinates.forEach(coord => {
                    const distance = calculateDistance(point, coord);

                    if (distance < minDistanceInLink) {
                        minDistanceInLink = distance;
                        closestCoordInLink = coord;
                    }
                });

                // 가장 가까운 두 링크를 선정
                if (minDistanceInLink < minDistance1) {
                    // 현재의 첫 번째 최단 거리 링크를 두 번째로 이동
                    minDistance2 = minDistance1;
                    closestLink2 = closestLink1;

                    // 새로 발견된 링크를 첫 번째 최단 거리 링크로 설정
                    minDistance1 = minDistanceInLink;
                    closestLink1 = link;
                } else if (minDistanceInLink < minDistance2) {
                    // 두 번째로 가까운 링크를 업데이트
                    minDistance2 = minDistanceInLink;
                    closestLink2 = link;
                }
            });

            if (closestLink1 && closestLink2) {
                // 링크 쌍을 정렬하여 중복된 쌍 제거
                let pair = [closestLink1, closestLink2].sort((a, b) => a.properties.ID - b.properties.ID);
                closestLinkPairs.push(pair);
            }
        });

        return closestLinkPairs;
    }

    function mergeLinks(link1, link2) {
        const coordinates1 = link1.geometry.coordinates;
        const coordinates2 = link2.geometry.coordinates;

        // 링크의 첫 좌표와 마지막 좌표 간의 거리를 계산
        const dist1_2 = calculateDistance(coordinates1[coordinates1.length - 1], coordinates2[0]);
        const dist1_1 = calculateDistance(coordinates1[0], coordinates2[0]);
        const dist2_2 = calculateDistance(coordinates1[coordinates1.length - 1], coordinates2[coordinates2.length - 1]);
        const dist2_1 = calculateDistance(coordinates1[0], coordinates2[coordinates2.length - 1]);

        // 각 케이스별로 가장 짧은 거리로 연결하는 방법을 선택
        let mergedCoordinates;
        if (dist1_2 < dist1_1 && dist1_2 < dist2_2 && dist1_2 < dist2_1) {
            // coordinates1의 마지막과 coordinates2의 처음을 연결
            mergedCoordinates = [...coordinates1, ...coordinates2];
        } else if (dist1_1 < dist1_2 && dist1_1 < dist2_2 && dist1_1 < dist2_1) {
            // coordinates1의 처음과 coordinates2의 처음을 연결
            mergedCoordinates = [...coordinates1.reverse(), ...coordinates2];
        } else if (dist2_2 < dist1_2 && dist2_2 < dist1_1 && dist2_2 < dist2_1) {
            // coordinates1의 마지막과 coordinates2의 마지막을 연결
            mergedCoordinates = [...coordinates1, ...coordinates2.reverse()];
        } else {
            // coordinates1의 처음과 coordinates2의 마지막을 연결
            mergedCoordinates = [...coordinates1.reverse(), ...coordinates2.reverse()];
        }

        // 병합된 좌표에서 중복된 좌표를 제거
        mergedCoordinates = removeDuplicateCoordinates(mergedCoordinates);

        return mergedCoordinates;
    }
}

// ================== snap ==================
// 스냅 대상을 업데이트하는 함수
function updateSnapTargets() {
    snapTargets = [];

    let features = map.getSource(LINK_NODE_STATION_SOURCE_ID)._options.data.features

    snapTargets = features
        .filter(feature => feature.geometry.type === 'Point') // 노드만 필터링
        .map(feature => feature.geometry.coordinates); // 좌표만 추출
}

// 핸들 이동 시 스냅 적용
function handleSnap(e) {
    const featureId = e.features[0].id;
    const feature = draw.get(featureId);

    if (!feature) {
        console.error('Feature not found:', featureId);
        return;
    }

    const geometry = feature.geometry;

    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
        // 링크의 각 핸들 포인트에 대해 스냅 적용
        const updatedCoordinates = geometry.coordinates.map(coord => {
            return findClosestSnapTarget(coord) || coord;
        });

        // 업데이트된 feature 객체 생성
        const updatedFeature = {
            type: 'Feature',
            id: featureId,
            geometry: {
                type: 'LineString',
                coordinates: updatedCoordinates
            },
            properties: feature.properties // 기존 속성 유지
        };

        // 기존 피처 삭제
        draw.delete(featureId);

        // 새 피처 추가
        draw.add(updatedFeature);

        console.log(`Feature ${featureId} updated successfully.`);
    }

    // 하이라이트 레이어 업데이트
    // updateHighlightLayer(snapTargets);
}

// 가장 가까운 스냅 대상을 찾는 함수
function findClosestSnapTarget(coord) {
    let minDistance = Infinity;
    let closestPoint = null;

    snapTargets.forEach(target => {
        const distance = turf.distance(coord, target, { units: 'meters' });

        if (distance < minDistance && distance < SNAP_DISTANCE) {
            minDistance = distance;
            closestPoint = target;
        }
    });

    return closestPoint;
}
