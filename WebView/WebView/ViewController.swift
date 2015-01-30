//
//  ViewController.swift
//  WebView
//
//  Created by 破锣锅 on 14-6-15.
//  Copyright (c) 2014年 破锣锅. All rights reserved.
//

import UIKit

class ViewController: UIViewController {
    
    var webview: UIWebView!
                            
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        
        self.modifyUserAgent()
        self.webviewInit()
        self.webviewLoad()
        self.messageTimerInit()
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func webviewInit() {
        self.webview = UIWebView(frame: UIScreen.mainScreen().applicationFrame)
        self.view.addSubview(self.webview)
    }
    
    func webviewLoad() {
        //var url = NSURL(string: "http://h5.m.taobao.com/trip/hotel/search/index.html")
        var url = NSURL(string: "http://b.ued.taobao.net/liuhuo.gk/bridge/demo/example.html")
        var request = NSURLRequest(URL: url)
        self.webview.reload()
        self.webview.loadRequest(request)
    }
    
    func messageTimerInit() {
        var messageTimer = NSTimer.scheduledTimerWithTimeInterval(0.02, target: self, selector: "messageLoop", userInfo: nil, repeats: true)
    }
    
    func messageLoop() {
        let FECTCHMESSAGE = "if(this.messageQueueFetch) messageQueueFetch();"
        var messages: NSString = webview.stringByEvaluatingJavaScriptFromString(FECTCHMESSAGE)
        
        if(messages.length > 0) {
            println("BRIDGE PROTOCOL DETECTED:")
            println(messages)
        }
    }
    
    func modifyUserAgent() {
        var clientVersion: NSString = "AliApp(LX/4.0.0) AliTrip/4.0.0"
        // for "avoid show blank when webview first time lanch after app lanch
        var origin: NSString = UIWebView().stringByEvaluatingJavaScriptFromString("navigator.userAgent")
        var userAgent: NSString = "\(origin) \(clientVersion)"
        NSUserDefaults.standardUserDefaults().registerDefaults(["UserAgent": userAgent])
        NSUserDefaults.standardUserDefaults().synchronize()
    }


}

