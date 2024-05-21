function showHideLayer(Nm) {
    if ($('#check_'+Nm).is(':checked') === true) {
        for (i = 0; i < newProperty[Nm].length; i++) {
            map.setLayoutProperty(newProperty[Nm][i], 'visibility', 'visible');
        }
        map.setLayoutProperty('polygons_'+Nm, 'visibility', 'visible');
        map.setLayoutProperty('outline_'+Nm, 'visibility', 'visible');
    } else {
        for (i = 0; i < newProperty[Nm].length; i++) {
            map.setLayoutProperty(newProperty[Nm][i], 'visibility', 'none');
        }
        map.setLayoutProperty('polygons_'+Nm, 'visibility', 'none');
        map.setLayoutProperty('outline_'+Nm, 'visibility', 'none');
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

function plusLayers() {
    var datatype = ""
    var value = $('#layer-proper').val()
    var filename = $('#layer-fileName').val()
    var checkname = document.querySelectorAll('.layer-file')
    for (i = 0; i < checkname.length; i++) {
        if (filename == checkname[i].id ) {
            alert('동일한 레이어 이름이 존재합니다')
            return
        }
    }
    if (value === 'none') {
        alert('파일 유형을 선택해주세요')
    } else if (filename === '') {
        alert('파일 이름을 입력해주세요')
    } else {
        var data = {
            fileName : filename,
            datatype : value,
            crs : "GEOGCS[GCS_WGS_1984," +
                "  DATUM[D_WGS_1984," +
                "  SPHEROID[WGS_1984, 6378137.0, 298.257223563]]," +
                "  PRIMEM[Greenwich, 0.0]," +
                "  UNIT[degree, 0.017453292519943295]," +
                "  AXIS[Longitude, EAST]," +
                "  AXIS[Latitude, NORTH]]",
            data : {
                crs : {
                    properties : {
                        name : "EPSG:4326",
                    },
                    type : "name"
                },
                features : [],
                type : "FeatureCollection",
            }
        }
        var object = {}
        $(".proper-typeli td").each(function(index, element) {
            if (index % 2 === 0) {
                object[$(element).text()] = ""
            }
        });

        newProperty[filename] = object

        if ($("#layer-proper").val() === "node")  {
            datatype = "Point"
        } else if ($("#layer-proper").val() === "line") {
            datatype = "MultiLineString"
        } else {
            datatype = "Polygon"
        }

        dataArr[filename] = data

        $("#layer-proper,  #proper-type").val('none')
        $('#layer-fileName, #proper-typenm').val('');
        while ($('.plusproperty').length > 0) {
            $('.plusproperty').eq(0).remove();
        }
        polygon(data.data.features)
        createLayer(data, datatype)

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
    for (i = 0; i < layer.length; i++) {
        layer[i].classList.remove("selected");
    }
    if ($("#"+obj.id).length > 0) {
        $("#"+obj.id).addClass("selected")
    } else {
        $("#"+obj).addClass("selected")
    }

    fileNm = $('.selected .file-tit').text()
    var none = "<option value=\"none\">선택해주세요</option>"
    $("#label-list").empty()
    $("#label-list").append(none)
    var title = Object.keys(newProperty[fileNm])
    for (i = 0; i < title.length; i++) {
        html = "<option value="+title[i]+">"+title[i]+"</option>"
        $("#label-list").append(html)
    }
    getProperties()
}