function showHideLayer(Nm) {
    const dataType = checkDataType(dataArr[Nm]);

    if ($('#check_'+Nm).is(':checked') === true) {
        for (i = 0; i < newProperty[Nm].length; i++) {
            map.setLayoutProperty(newProperty[Nm][i], 'visibility', 'visible');
        }

        if (dataType === "Point") {
            map.setLayoutProperty('nodes_'+Nm, 'visibility', 'visible');
        } else if (dataType === "MultiLineString") {
            map.setLayoutProperty('links_'+Nm, 'visibility', 'visible');
        } else {
            map.setLayoutProperty('polygons_'+Nm, 'visibility', 'visible');
            map.setLayoutProperty('outline_'+Nm, 'visibility', 'visible');
        }
    } else {
        for (i = 0; i < newProperty[Nm].length; i++) {
            map.setLayoutProperty(newProperty[Nm][i], 'visibility', 'none');
        }

        if (dataType === "Point") {
            map.setLayoutProperty('nodes_'+Nm, 'visibility', 'none');
        } else if (dataType === "MultiLineString") {
            map.setLayoutProperty('links_'+Nm, 'visibility', 'none');
        } else {
            map.setLayoutProperty('polygons_'+Nm, 'visibility', 'none');
            map.setLayoutProperty('outline_'+Nm, 'visibility', 'none');
        }
    }
}

function plusProper() {
    nm = $("#proper-typenm").val()
    type = $("#proper-type").val()
    if (nm === '' ||nm === null) {
        alert('이름을 입력해주세요')
    } else if (type === 'none') {
        alert('유형을 선택해주세요')
    } else {
        html = "<tr class='plusproperty' onclick='selectedType(this)'><td>"+nm+"</td><td>"+type+"</td></tr>"
        $(".proper-typeli").append(html)
    }
}

function selectedType(e) {
    e.classList.toggle('selected')
}

function deleteProper() {
    $('.proper-typeli .selected').remove()
}

function addLayers() {
    // 폼에서 값을 가져옵니다.
    var newData = {}
    var datatype = "";
    var value = $('#layer-proper').val();
    var fileNameTxt = $('#layer-fileName').val();
    var checkname = document.querySelectorAll('.layer-file');

    // 중복 레이어 이름 확인
    for (var i = 0; i < checkname.length; i++) {
        if (fileNameTxt === checkname[i].id) {
            alert('동일한 레이어 이름이 존재합니다');
            return;
        }
    }

    // 입력값 검증
    if (value === 'none') {
        alert('파일 유형을 선택해주세요');
        return;
    } else if (fileNameTxt === '') {
        alert('파일 이름을 입력해주세요');
        return;
    }

    // 레이어 데이터 구조 준비
    var data = {
        fileName: fileNameTxt,
        datatype: value,
        crs: {
            type: "name",
            properties: {
                name: "EPSG:4326"
            }
        },
        data: {
            crs: {
                properties: {
                    name: "EPSG:4326",
                },
                type: "name"
            },
            features: [],
            type: "FeatureCollection",
        }
    };

    // 속성 객체 초기화
    var object = {};
    $(".proper-typeli td").each(function(index, element) {
        if (index % 2 === 0) {
            object[$(element).text()] = "";
        }
    });

    newData["data"] = data
    newData["fileName"] = fileNameTxt

    newProperty[fileNameTxt] = object

    // 데이터 타입 설정
    if (value === "node") {
        datatype = "Point";
        drawNodePoint(newData).then(r => true);
    } else if (value === "line") {
        datatype = "MultiLineString";
        drawLinkLine(newData).then(r => true);
    } else {
        datatype = "Polygon"
        drawPolyline(newData).then(r => true);
    }

    createLayer(data, datatype);

    // 폼 초기화
    $("#layer-proper, #proper-type").val('none');
    $('#layer-fileName, #proper-typenm').val('');
    while ($('.plusproperty').length > 0) {
        $('.plusproperty').eq(0).remove();
    }
}

function createLayer(data, type) {
    var html = "";
    html += '<div class="layer-file basic-font selected" id=\''+data.fileName+'\'>';
    html += '<input type="checkbox" id="check_'+data.fileName+'" onclick="showHideLayer(\''+data.fileName+'\')" checked >';
    if (type === "Point") {
        html += '<i class="fa-solid fa-share-nodes"></i>'
    } else if (type === "MultiLineString") {
        html += '<i class="fa-brands fa-hashnode"></i>'
    } else {
        html += '<i class="fa-solid fa-draw-polygon"></i>'
    }
    html += '<div class="file-info" onclick="selectedLayer(\''+data.fileName+'\')">';
    html += '<div class="file-tit">'+data.fileName+'</div>';
    html += '</div>';
    html += '<div class="dropdown"> ' +
        '<i class="fa-solid fa-ellipsis-vertical" data-bs-toggle="dropdown"></i></button> <ul class="dropdown-menu">' +
        '<li onclick="saveShp(\''+data.fileName+'\')" class="dropdown-item">저장</li>' +
        '<li onclick="removePolygon(\''+data.fileName+'\')" class="dropdown-item">삭제</li>' +
        '</ul></div></div>'

    $(".layer-file-list").append(html);

    fileNmList.push(data.fileName)

    selectedLayer(data.fileName)
}


function selectedLayer(obj) {
    var layer = document.getElementsByClassName("layer-file");

    var beforeLayerId = "";
    for (i = 0; i < layer.length; i++) {
        if (layer[i].classList.contains(obj)) {
            beforeLayerId = $(layer[i]).find(".file-tit").text()
        }
        layer[i].classList.remove("selected");
    }

    $("#"+obj).addClass("selected")

    if (isEdit()) {
        // 수정모드일때 타겟 data 변경
        if (beforeLayerId !== obj) {
            // 전에 수정하던 내용을 저장 후 보기모드로 전환
            startViewerMode()
            // 다시 해당 레이어 편집모드로 전환
            startEditMode()
        }
    }

    fileNm = $('.selected .file-tit').text()
    var none = "<option value=\"none\">선택해주세요</option>"
    $("#label-list").empty()
    $("#label-list").append(none)
}