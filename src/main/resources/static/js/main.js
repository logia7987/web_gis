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

// 리스트에 db에 저장된 파일 가져오는 함수
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
            const dataType = checkDataType(data);
            if (dataType === "Point")  {
                drawNodePoint(data);
            } else if (dataType === "MultiLineString") {
                drawLinkLine(data)
            } else {
                drawPolyline(data);
            }
            createLayer(data, dataType);
        },
        error: function (error) {
            console.error('Error uploading file:', error);
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
    // var label = $('#label-list').val()
    var geoData = map.getSource('data_' + fileNm)._options.data.features
    $('.mapboxgl-ctrl-group').show()
    $('.mapboxgl-gl-draw_line,.mapboxgl-gl-draw_point,.mapboxgl-gl-draw_combine,.mapboxgl-gl-draw_uncombine').hide()
    if (draw.getAll().features.length > 0) {
        draw.getAll().features.forEach(function(drawElement) {
            for (var i = 0; i < dataArr[fileNm].data.features.length; i++) {
                if (dataArr[fileNm].data.features[i].id === drawElement.id) {
                    dataArr[fileNm].data.features[i] = drawElement;
                }
            }
        });
    }
    for (var i = 0; i < geoData.length; i++) {
        if (geoData[i].id === property.id) {
            geoData.splice(i, 1)
            draw.add(property)
        }
    }
    var updatedFeatures = geoData;
    // Set the updated data
    map.getSource('data_' + fileNm).setData({
        type: 'FeatureCollection',
        features: updatedFeatures
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
        fileNm = $('.selected .file-tit').text()
        $('#btn-status').text("편집 모드")
        // var type = $(".selected").eq(0).attr("class");
        var type = $($(".selected").find(".fa-solid")[0]).attr("class")
        loadProperty = dataArr
        if (type === 'fa-solid fa-ellipsis-vertical')  {

        } else if (type === 'fa-solid fa-share-nodes') {
            getNodeDetail()
        } else {
            polygonDetail()
        }
    } else if ( $('#btn-status').text() === '편집 모드') {
        $('.mapboxgl-ctrl-group').hide()
        // var item = document.getElementsByClassName("file-info-item");
        $('#btn-status').text("보기 모드")
        // for (i = 0; i < item.length; i++) {
        //     item[i].classList.remove("selected");
        // }
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
        getProperties()
        draw.deleteAll();
        propertyArr = []
        drawArr = []
    } else if (draw.getAll().features.length === 0 && drawArr.length > 0) {
        drawArr = []
        propertyArr = []
        loadProperty = dataArr
        getProperties()
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