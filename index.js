/*
 * A Bridge Between H5 And Native.
 * By: Guokai @benbencc
 * Created: 2013-7-24
 * */

// 面向Android和iOS的JS调用原理：

// Android 通过桥（客户端暴露在WebView全局对象下的一个对象，内挂各种API方法）
// 的方式进行调用，如`window['Android_Bridge']['method'](JSON)`。iOS通过自定
// 义Scheme（如`native://method?data=JSON`）方式调用。需要回调的接口需要将函
// 数名称在调用时一并传给客户端，同时将回调函数通过唯一名称挂在全局，待客户端
// 执行回调后移除该全局函数。

(function() {

    // Bridge是为H5和客户端交互通讯而产生的一个中间件，即一个JavaScript的SDK。负责
    // 处理H5和客户端的方法调用、通信及H5页面自身的降级处理（非内嵌在客户端的情况）。

    var Bridge = function() {
        this.init.apply(this, arguments);
    };

    Bridge.prototype = {
        version: '0.0.1',

        // 桥初始化，初始化过程中会：主动探测UA，判断页面所属的生存环境，如果是在客户端中，
        // 会探测获取客户端的平台类型和版本号，初始化消息队列，并主动探测网络类型，并同所属
        // 环境主动握手交换双方所需的额外基础信息。

        init: function(bridgeName) {
            var that = this;

            that.platform = 'h5';
            that.bridgeName = bridgeName || 'ali_trip_webview_bridge';
            that.bridge = window[that.bridgeName];
            that.userAgentDetect.apply(this, arguments);
            that.messageQueueInit();
            that.deviceInfoDetect();
            that.connectionInfoDetect();
            that.handShake.apply(this, arguments);

            that.notification.superthat = that;
        },

        // 消息队列初始化，针对iOS的实现机制单独做的处理，iOS会主动轮询
        // 消息队列中的操作，并批量取回处理。

        messageQueueInit: function() {
            var that = this;

            if(that.platform === 'ios') {
                window.messageQueue = [];
                window.messageQueueFetch = function() {
                    var response;
                    response = window.messageQueue.length ? JSON.stringify(window.messageQueue) : '';
                    window.messageQueue = [];

                    if(response) {
                        return response;
                    }
                };
            }
        },

        // 握手协议，用于页面同所属生存环境在首次初始化时进行基础信息交换。

        handShake: function(callback) {
            var that = this;

            that.pushBack('bridge:', 'ready', {
                data: {},
                successCallback: function() {
                    callback && callback();
                }
            });
        },

        // UA探测，用于检测当前页面是否生存在淘宝旅行客户端内，如果在客户端内
        // 则继续获取客户端的平台类型及版本号用于后续的操作。

        // User-Agent Format:

        // Mozilla/5.0 (iPhone; U; CPU iPhone OS 3_1_2 like Mac OS X; zh-cn; AliTrip/2.8.0) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile Safari/528.16
        // Mozilla/5.0 (Linux; U; Android 4.1.1; zh-cn; MI 2 Build/JRO03L; AliTrip/2.8.0) AppleWebKit/528.18 (KHTML, like Gecko) Version/4.0 Mobile Safari/528.16

        // References:

        // http://www.ietf.org/rfc/rfc2616.txt
        // http://www.useragentstring.com/

        userAgentDetect: function() {
            var that = this;
            var ua = navigator.userAgent;
            var match = ua.match(/AliTrip[\s\/][\d\.]+/igm);

            if(match) {
                that.platform = ua.match(/(iPad|iPhone|iPod)/igm) ? 'ios' : 'android';
                that.client.version = parseInt(match[0].match(/[\d\.]+/igm)[0].split('.').join(''));
            }
        },

        // 设备信息探测，用于检测当前页面的设备信息。

        deviceInfoDetect: function() {
            var that = this;

            if(that.platform === 'h5') {
                return;
            }

            that.pushBack('bridge:', 'client_info', {
                successCallback: function(client_info) {
                    that.client = client_info; //ttid, push_token, device_id, client_version, client_type
                }
            });
        },

        // 网络类型探测，用于检测当前环境的页面类型，如果是生存在浏览器中，
        // 则取浏览器的`navigator.connection`属性，如果生存在客户端中，则
        // 根据协议接口进行获取，并作为桥的属性后续可被访问到。

        //    ```
        //    {
        //        "type" : "2",
        //        "mapping": {
        //            "UNKNOWN": 0,
        //            "ETHERNET": 1,
        //            "WIFI": 2,
        //            "CELL_2G": 3,
        //            "CELL_3G": 4,
        //            "CELL_4G": 5,
        //            "CELL": 6,
        //            "NONE": 7,
        //        }
        //    }
        //    ```

        connectionInfoDetect: function() {
            var that = this;

            if(that.platform === 'h5') {
                that.connection = navigator.connection || {};
                return;
            }

            that.pushBack('bridge:', 'networktype', {
                successCallback: function(conn) {
                    that.connection.type = conn;
                }
            });
        },

        sendURI: function(uri, newProxy) {
            var proxy = this.mClientProxy;
            
            if (newProxy) {
                this.buildProxy(uri);
                return this;
            }

            if (proxy || (proxy = document.querySelector('#J_MClientProxy'))) {
                proxy.attr('src', uri);
            } else {
                proxy = this.buildProxy(uri);
            }

            this.mClientProxy = proxy;
            
            return this;
        },

        buildRandom: function() {
            var that = this;
            var random = new Date().getTime() + '_' + parseInt(Math.random() * 1000000);

            return random;
        },
        
        buildProxy: function(uri) {
            var that = this;
            var guid = that.buildRandom();
            var iframeString = '<iframe id="J_MClientProxy_' + guid + '" class="hidden mclient-proxy" style="width:0;height:0;opacity:0;display:none;" src="' + uri + '"></iframe>';
            var proxy = $(iframeString);

            $('body').append(proxy);
            return proxy;
        },

        buildCallback: function(fn) {
            var that = this;
            var guid = that.buildRandom();
            var callbackName = 'Bridge_Callbacks_' + guid;

            window[callbackName] = (function(cb, callbackName) {
                return function() {
                    cb.apply(this, arguments);
                    delete window[callbackName];
                };
            })(fn, callbackName);

            return callbackName;
        },

        // 主要API，用于页面同客户端的协议回调，`protocol`协议默认为`native:`，
        // 可以省略不传，`host`为协议约定的主体，如`app/beep`，`data`为调用时
        // 传递给客户端的所需数据对象，对象内可包含`successCallback`和`failCallback`，
        // 鉴于iOS回调的实现机制，`newProxy`参数是为了避免在iOS下多次连续回调
        // 造成的消息丢失，当设为`true`时，每次均会创建一个新的`iframe`进行发送。

        pushBack: function(protocol, host, data, newProxy) {
            var that = this;
            var uri = (protocol || 'native:') + '//' + host + '?params=';
            var callbackName;
            var args = [].slice.call(arguments);

            if(typeof(protocol) !== 'string' || typeof(host) !== 'string') {
                protocol = 'native:';
                host = args[0];
                data = args[1];
                newProxy = args[2];
                uri = (protocol || 'native:') + '//' + host + '?params=';
            }

            if(that.platform === 'h5') {
                return;
            }

            data = data || {};

            for(var i in data) {
                if(data.hasOwnProperty(i)) {
                    if(typeof(data[i]) === 'function') {
                        callbackName = that.buildCallback(data[i]);
                        data[i] = callbackName;
                    }

                    if(typeof(data[i]) === 'object' && data[i].hasOwnProperty('length')) {
                        for(var j = 0; j < data[i].length; j++) {
                            if(typeof(data[i][j]) === 'function') {
                                callbackName = that.buildCallback(data[i][j]);
                                data[i][j] = callbackName;
                            }
                        }
                    }

                    if(i !== i.replace(/([A-Z])/g,"_$1").toLowerCase()) {
                        data[i.replace(/([A-Z])/g,"_$1").toLowerCase()] = data[i];
                        delete data[i];
                    }
                }
            }

            if(that.platform === 'android') {
                uri += encodeURIComponent(JSON.stringify(data));

                if(uri.match(/^native:\/\//igm)) {
                    that.bridge && that.bridge['startNativeService'] && that.bridge['startNativeService'](uri);
                }

                if(uri.match(/^page:\/\//igm))  {
                    that.bridge && that.bridge['startNativePage'] && that.bridge['startNativePage'](uri);
                }

                if(uri.match(/^bridge:\/\//igm)) {
                    that.bridge && that.bridge['startNativeBridge'] && that.bridge['startNativeBridge'](uri);
                }

                return;
            }

            if(that.platform === 'ios') {
                uri += encodeURIComponent(JSON.stringify(data));
                messageQueue.push(uri);
                return;
            }

            uri += encodeURIComponent(JSON.stringify(data));
            that.sendURI(uri, newProxy);
        },

        getRequestParam: function(uri, param) {
            var value;
            uri = uri || window.location.href;
            value = uri.match(new RegExp('[\?\&]' + param + '=([^\&]*)(\&?)', 'i'));
            return value ? decodeURIComponent(value[1]) : value;
        },

        getRequestParams: function(uri) {
            var search = location.search.substring(1);
            uri = uri || window.location.href;
            return search ? JSON.parse('{"' + search.replace(/&/g, '","').replace(/=/g,'":"') + '"}', function(key, value) {
                return key==="" ? value : decodeURIComponent(value);
            }) : {};
        },

        // 获取URL和客户端传递的所有参数，会优先获取URL中的参数

        getParams: function() {
            var that = this;
            var params = that.getRequestParams();
            var client = that.client;

            for(var i in client) {
                if(client.hasOwnProperty(i) && params.hasOwnProperty(i)) {
                    params[i] = client[i];
                }
            }

            return params;
        },

        notification: {

            // `alert`弹框，对于浏览器的生存环境，仅`message`参数有效，但对于客户端类
            // 生存环境，则可以接收回调，以及弹出框的标题和按钮文案，回调中客户端会回
            // 传用户相应点击的按钮的索引值。

            alert: function(message, alertCallback, title, buttonLabels) {
                var that = this;
                var callback = function(ret) {
                    var buttonIndex = ret.buttonIndex;

                    if(Object.prototype.toString.call(alertCallback) === '[object Array]') {
                        alertCallback[buttonIndex] && alertCallback[buttonIndex].apply(this, arguments);
                        return;
                    }

                    alertCallback && alertCallback();
                };

                if(that.superthat.platform === 'h5') {
                    alert.apply(null, arguments);
                    return;
                }

                if(typeof(buttonLabels) === 'string') {
                    buttonLabels = [buttonLabels];
                }

                that.superthat.pushBack('bridge:', 'alert', {
                    message: message,
                    successCallback: callback,
                    title: title,
                    buttonNames: buttonLabels
                });
            },

            // `confirm`确认对话框，对于浏览器的生存环境，仅`message`和`confirmCallback`
            // 参数有效，但对于客户端类生存环境，则可以接收回调，以及弹出框的标题和按钮
            // 文案，回调中客户端会回传用户相应点击的按钮的索引值。

            confirm: function(message, confirmCallback, title, buttonLabels) {
                var that = this;

                if(that.superthat.platform === 'h5') {
                    if(confirm.apply(null, arguments)) {
                        confirmCallback && confirmCallback();
                    }

                    return;
                }

                if(typeof(buttonLabels) === 'string') {
                    buttonLabels = [buttonLabels];
                }

                that.superthat.pushBack('bridge:', 'confirm', {
                    message: message,
                    title: title,
                    successCallback: confirmCallback,
                    buttonNames: buttonLabels
                });
            },

            // `prompt`提示对话框，对于浏览器的生存环境，仅`message`、`value`和
            // `promptCallback`参数有效，但对于客户端类生存环境，则可以接收回调，
            // 以及弹出框的标题和按钮文案，回调中客户端会回传用户相应点击的按钮
            // 的索引值。

            prompt: function(message, value, promptCallback, title, buttonLabels) {
                var that = this;

                if(that.superthat.platform === 'h5') {
                    prompt.apply(null, arguments);
                    return;
                }

                if(typeof(buttonLabels) === 'string') {
                    buttonLabels = [buttonLabels];
                }

                that.superthat.pushBack('bridge:', 'prompt', {
                    message: message,
                    value: value,
                    successCallback: promptCallback,
                    title: title,
                    buttonNames: buttonLabels
                });
            },

            // 弱提示，用于调用客户端的弱提示进行些许文案的提示。

            toast: function(message, milliseconds) {
                var that = this;

                if(that.superthat.platform === 'h5') {
                    return;
                }

                that.superthat.pushBack('bridge:', 'toast', {
                    message: message,
                    milliseconds: milliseconds
                });
            },

            // 蜂鸣，调用客户端的蜂鸣器按照指定的次数进行蜂鸣。

            beep: function(times) {
                var that = this;

                that.superthat.pushBack('bridge:', 'beep', {
                    times: times
                });
            },

            // 震动，进行设备的震动，持续指定的毫秒时长。

            vibrate: function(milliseconds) {
                var that = this;

                that.superthat.pushBack('bridge:', 'vibrate', {
                    milliseconds: milliseconds
                });
            }
        },

        device: {},

        client: {},

        connection: {},

        // 新开页面打开页面，浏览器生存环境下打开新的标签页，客户端生存环境
        // 下则调用系统浏览器打开相应新的页面。

        openBrowser: function(url) {
            var that = this;

            if(that.platform === 'h5') {
                window.open(url);
                return;
            }

            that.pushBack('bridge:', 'open_system_browser', {
                url: url
            });
        },

        // 针对iOS，跳转并打开AppStore的相应地址，对于浏览器而言则在新标签
        // 中打开对应的应用地址。

        openAppStore: function(url) {
            var that = this;

            if(that.platform === 'h5') {
                window.open(url);
                return;
            }

            that.pushBack('bridge:', 'open_app_store', {
                url: url
            });
        },

        // 客户端生存环境下设置WebView顶部的标题显示文案，对于浏览器则直接
        // 更改页面的标题文案。子标题为可选参数，只适用在客户端内嵌的情况。

        setTitle: function(title, subtitle) {
            var that = this;

            if(that.platform === 'h5') {
                document.title = title;
                return;
            }

            that.pushBack('bridge:', 'set_webview_title', {
                title: title,
                subtitle: subtitle
            });
        },

        // 跳转到相应的客户端页面，如果有额外的数据则通过`ext`参数传递给客户端。

        open: function(pagename, ext, successCallback, naviType, animeType) {
            var that = this;
            var params = {
                page_name: pagename,
                data: ext || {},
                successCallback: successCallback,
                naviType: naviType || 0,
                animeType: typeof(animeType) !== 'undefined' ? animeType : 4
            };

            that.pushBack('page:', 'goto', params);
        },

        // 返回上一页，对于浏览器而言，直接调用`history.back`返回上一个历史记录，
        // 对于客户端而言则通过协议调用返回上一个WebView打开的相应页面。

        back: function(pagename, ext) {
            var that = this;

            if(that.platform === 'h5') {
                history.back();
                return;
            }

            if(pagename) {
                that.pushBack('bridge:', 'back', ext);
                return;
            }

            that.pushBack('bridge:', 'back', ext);
        },

        // 关闭当前的客户端页面，如果有额外的数据则通过`ext`参数传递给客户端。

        close: function(ext) {
            var that = this;

            if(that.platform === 'h5') {
                window.close();
                return;
            }

            that.pushBack('page:', 'close', ext);
        }
    };

    this.Bridge = Bridge;

}).call(this);

