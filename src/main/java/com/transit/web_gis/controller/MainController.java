package com.transit.web_gis.controller;

import com.transit.web_gis.service.ShapeService;
import com.transit.web_gis.service.ShpService;
import jakarta.servlet.http.HttpSession;
import org.apache.tomcat.util.http.fileupload.FileUtils;
import org.json.simple.JSONObject;
import org.json.simple.parser.JSONParser;
import org.json.simple.parser.ParseException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

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

}
