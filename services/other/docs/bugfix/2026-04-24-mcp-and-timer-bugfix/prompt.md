# 问题1：
Uncaught Exception:Error: EPIPE: broken pipe, write
at Socket. write (node:internal/net:61:25)at writeOrBuffer (node:internal/streams/writable:392:12)at_write (node:internal/streams/writable:333:10)at Writable.write (node:internal/streams/writable:337:10)at console.value (node:internal/console/constructor:305:16)at console.log (node:internal/console/constructor:380:26)at WebContents.<anonymous>
(file:///D:/work_area/Ddo/services/web-ui/dist-electron/main.js:220:13)at WebContents.emit (node:events:529:35)

# 问题2：
MCP没法删除，点击删除后：
http://127.0.0.1:50003/api/v1/mcps/1fce8484-7787-42d3-8a7d-527a24849471/delete
会正常返回200但是没有实际删除

# 问题3：
mcp功能有缺失，我希望根据mcp的标准协议，可以获取到工具对应的工具列表和每个工具对应的参数列表，可以进行测试MCP工具功能。
需要注意：本需求应该涉及到跨服务修改，你好好查看现在的实现逻辑，帮我完善一下。CLI端和Web端和客户端都要修改且和这个需求。