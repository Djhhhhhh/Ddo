# Service Rules

> 由 AI 在开发过程中自动维护的规则文件。
> 发现时间：2026-04-14

## 架构规则

- FastAPI 应用结构：app/main.py 创建实例，app/api/ 存放路由，app/core/ 存放配置和核心逻辑（2026-04-14）
- 路由聚合模式：在 app/api/__init__.py 中使用 APIRouter 聚合所有子路由，统一 prefix="/api"（2026-04-14）
- 配置管理：使用 Pydantic Settings 统一处理环境变量和 .env 文件，通过 `@lru_cache` 缓存配置实例（2026-04-14）
- 生命周期管理：使用 FastAPI 的 lifespan 上下文管理器处理启动/关闭逻辑（2026-04-14）
- 占位实现：未实现的功能返回 HTTP 501，并在错误信息中注明对应的 Task ID（2026-04-14）

## 代码规范

- 类型注解：所有函数参数和返回值使用类型注解，请求/响应模型继承自 pydantic.BaseModel（2026-04-14）
- 路由文档：每个 endpoint 必须包含 summary 和 description，使用 Field 描述模型字段（2026-04-14）
- 日志格式：使用 [event_name] key=value 格式，便于后续日志分析（2026-04-14）
- 配置命名：环境变量使用大写下划线，Settings 类属性使用小写下划线（2026-04-14）
- 错误处理：使用 FastAPI 的 HTTPException，明确返回合适的 HTTP 状态码（2026-04-14）

## 常见陷阱

- OpenRouter API Key 不要硬编码，必须使用环境变量或 .env 文件（2026-04-14）
- Uvicorn 的 reload=True 只适合开发，生产环境必须禁用（2026-04-14）
- CORS 中间件配置：开发可用 allow_origins=["*"]，生产必须限制具体域名（2026-04-14）
- Pydantic Settings 的 `extra="ignore"` 避免未定义配置项报错（2026-04-14）

## 示例参考

### API Endpoint 定义示例

```python
@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check",
    description="Returns service health status.",
)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", version="0.1.0")
```
（2026-04-14）

### 配置定义示例

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: Optional[str] = Field(default=None)

    @property
    def openrouter_enabled(self) -> bool:
        return self.openrouter_api_key is not None and len(self.openrouter_api_key) > 0
```
（2026-04-14）
