## Native2H5
`mClient协议约定及优先级梳理 v0.1`

---

### Overview

- H5 WebView特性方法
- 客户端协议接口约定（握手通讯）
- 客户端页面跳转及跳转拦截
- 客户端唤醒（调研总结）
- 降级方案（页面生存环境自适应）

##### 面向Android和iOS的JS调用原理

1. `Android` 通过桥（客户端暴露在WebView全局对象下的一个对象，内挂各种API方法）的方式进行调用，如`window['Android_Bridge']['method'](JSON)`。

2. `iOS`通过自定义`Scheme`（如`native://method?data=JSON`）方式调用。

3. 需要回调的接口需要将函数名称在调用时一并传给客户端，同时将回调函数通过唯一名称挂在全局，待客户端执行回调后移除该全局函数。

4. 握手通讯，`mclient`初始化时发送`ready`消息，当客户端拦截到`ready`消息后返回`Ok`状态码，`mclient`拿到成功状态码后则认为初始化完成，否则将认为页面自身处在非客户端或者第三方WebView环境中进行执行降级逻辑处理。

`mClient`是为H5和客户端交互通讯而产生的一个中间件，即一个`JavaScript`的SDK。负责处理H5和客户端的方法调用、通信及H5页面自身的降级处理（非内嵌在客户端的情况）。

H5内嵌客户端需要借助WebView完成自身的展现和“存活”，H5自身由于权限有限，有些功能和特性需要借助客户端辅助提供一些属性和方法来实现。如设备蜂鸣、震动，网络类型的识别（2G/3G/Wifi等）相关特性，除此之外还有一些特有的事件（如点击`back`键，网络变化，电量报警等）。倘若WebView的功能能够足够完善，H5就能够更大的发挥其优势，就会有更大的用武之地。下面是参考借鉴`PhoneGap`所罗列的一些常用的属性、方法抑或事件（`排序按照优先级由高到低，非必要的特性已经暂时从下表中去除`）。

### Storage

##### Objects:

- localStorage

##### localStorage

开启本地存储特性

---

### UserAgent

请参照规范格式设置`WebView`的`UserAgent`，避免页面进行设备适配时取不到该字段的值或者取到的信息不正确。

---

### Connection

##### Properties 

- connection.type

##### Constants

- Connection.UNKNOWN
- Connection.ETHERNET
- Connection.WIFI
- Connection.CELL_2G
- Connection.CELL_3G
- Connection.CELL_4G
- Connection.CELL
- Connection.NONE

##### connection.type

获取当前用户网络环境类型，wifi/2G/3G, etc.

备注：`mclient`提供JavaScript钩子，通过钩子获取设备当前所处的网络环境及网络类型。iOS若在非Wifi网络环境下无法区分2G/3G状态，则默认认为是3G即可。

---

### Notification

##### Methods:

- alert
- confirm
- prompt
- beep
- vibrate

##### notification.alert

警告提示框

##### notification.confirm

确认提示框

##### notification.prompt

提示对话框

##### notification.beep

蜂鸣声

##### notification.vibrate

设备震动

---

### Device

##### Properties:

- name
- mclient
- platform
- uuid
- model
- version
        
##### device.name

设备名称

##### device.mclient

当前所用`mclient`的版本号

##### device.platform

平台类型

##### device.uuid

设备全球唯一标识

##### device.model

设备信息

##### device.version

操作系统版本号

##### Events

`按照优先级排序`

- backbutton
- deviceready
- online
- offline
- pause
- resume
- batterycritical
- batterylow
- batterystatus
- menubutton
- searchbutton
- startcallbutton
- endcallbutton
- volumedownbutton
- volumeupbutton
- shake

---

### Client

##### Properties:

- version

##### client.version

客户端版本号

---

### InAppBrowser

##### Methods:

- window.open

##### window.open

Events:

- loadstart
- loadstop
- loaderror
- exit

---

### 页面跳转/拦截

##### 跳转的页面类型：

- 商品详情页
- 系统登录框
- 跳转到AppStore
- 任意页面（如客户端首页）

##### 跳转方式：

- 协议约定方式
- 客户端拦截（借鉴主站客户端方式，规则是否能做成可配置的更加灵活）

### 协议约定

下述为原有的协议约定（是否需要调整或者变更还待确定），如有改动或者新增请及时同步变更信息。

###### a. 单VIEW操作

| 方法名                 |说明				 | 需要的参数名         |
| -----------------------|:------------------|:-------------------|
| open_system_browser    |用浏览器打开url 		|url                |
| client_appstore_call   |跳转到appstore 		|url                |
| set_browser_title      |设置顶部title			 |title              |
| client_page_back       |客户端页面回退（back到webview上一页） |-                  |
| client_alert           |警告提示框，要求客户端自定义风格 |title, msg, ok_wording, callback |
| client_confirm         |确认提示框，俩按钮的提示框 |title, msg, ok_wording, cancle_wording, ok_callback, cancel_callback |
| get_client_info        |获取客户端类型/版本信息 |callback           |
| get_client_location    |获取客户端定位信息 |callback, failback |
| show_loading    			|显示菊花  | |
| close_loading    			|关闭菊花  | |

###### b. 多VIEW操作

| 方法名                 |说明				 | 需要的参数名         |
| -----------------------|:------------------|:-------------------|
| open      		      |跳转(进入)到下一个view	|url, param, callback   	 |
| back		              |回退到上一个view			|args, callback      			     |


###### c. 通用操作

| 方法名                  | 说明               | 需要的参数名         |
| -----------------------|:------------------|:-------------------|
| start_data_statistics  | 客户端埋点          | control_type, control_name, args |

注释：

- control_type: 埋点类型，0为`page`, 1为`button`, etc.
- control_name: 埋点名称，如`1ActGoodsList`.
- args: 为了方便扩展灵活的附加参数对象。

### 降级方案

当“握手”信号检测不到响应时，即认为非客户端，按照H5页面逻辑处理。

### 统一封装

完善`mClient`形成统一的`API`接口供页面调用，针对客户端和H5自适应的逻辑处理应由`mClient`内部完成，业务方应当不需要关注。