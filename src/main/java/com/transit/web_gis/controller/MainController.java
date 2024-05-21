package com.transit.web_gis.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class MainController {

    @Value("${mapbox.accessToken}")
    private String mapboxAccessToken;

    @GetMapping("/")
    public String mainView(Model model) {

        model.addAttribute("mapboxAccessToken", mapboxAccessToken);
        return "html/main/index";
    }

}
