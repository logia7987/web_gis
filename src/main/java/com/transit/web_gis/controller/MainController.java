package com.transit.web_gis.controller;

import com.transit.web_gis.service.ShapeService;
import com.transit.web_gis.service.ShpService;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.geotools.geometry.jts.JTS;
import org.geotools.referencing.CRS;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.opengis.referencing.crs.CoordinateReferenceSystem;
import org.opengis.referencing.operation.MathTransform;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;

@Controller
public class MainController {

    @Value("${mapbox.accessToken}")
    private String mapboxAccessToken;

    @Autowired
    private ShpService shpService;

    @Autowired
    private ShapeService shapeService;

    private static final File tempDir = new File("C:\\mapbox\\shapefile_temp");

    @GetMapping("/")
    public String mainView(Model model) {
        model.addAttribute("mapboxAccessToken", mapboxAccessToken);
        model.addAttribute("shpList", shapeService.selectShpList());
        return "html/main/index";
    }

    @GetMapping("/popup/uploadPage")
    public String popupUpload(Model model, HttpSession session) throws IOException {

        // 세션에서 파일 경로 가져오기
        String jsonFilePath = (String) session.getAttribute("jsonFilePath");
        String fileName = (String) session.getAttribute("fileName");

        if (jsonFilePath != null) {
            File jsonFile = new File(jsonFilePath);
            try (FileReader reader = new FileReader(jsonFile)) {
                JSONParser parser = new JSONParser();
                JSONObject resultObj = new JSONObject();
                JSONObject jsonObj = (JSONObject) parser.parse(reader);

                resultObj.put("data", jsonObj);
                resultObj.put("fileName", fileName);

                model.addAttribute("jsonData", resultObj);
                model.addAttribute("fileName", fileName);
            } catch (IOException | ParseException e) {
                e.printStackTrace();
                model.addAttribute("error", "JSON 파일 읽기 중 오류 발생");
            }

            // 세션에서 파일 경로 제거 (필요에 따라)
            session.removeAttribute("jsonFilePath");
            session.removeAttribute("fileName");
            FileUtils.deleteDirectory(tempDir);
        }
        return "html/popup/modal_loadfile";
    }

    @RequestMapping("/test")
    @ResponseBody
    public static void main(String[] args) {
        double x = 361815.423;
        double y = 475092.0824;

        try {
            Point targetPoint = transformCoordinates(x, y);
            System.out.println("WGS84 좌표: 위도 " + targetPoint.getY() + ", 경도 " + targetPoint.getX());
        } catch (Exception e) {
            System.err.println("좌표 변환 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public static Point transformCoordinates(double x, double y) throws Exception {
        // Source and target CRS definitions
        CoordinateReferenceSystem sourceCRS = CRS.decode("EPSG:5186");
        CoordinateReferenceSystem targetCRS = CRS.decode("EPSG:5181");
        MathTransform transform = CRS.findMathTransform(sourceCRS, targetCRS, true);

        // Create a source point
        Coordinate sourceCoordinate = new Coordinate(x, y);
        GeometryFactory geometryFactory = new GeometryFactory();
        Point sourcePoint = geometryFactory.createPoint(sourceCoordinate);

        // Transform the source point to target CRS
        Point targetPoint = (Point) JTS.transform(sourcePoint, transform);
        return targetPoint;
    }

}