from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.webhook.aiohttp_server import SimpleRequestHandler
from aiohttp import web

bot = Bot(token="7250623185:AAHjyHuQoiRo90Ix3NrEhrSvqF4HrfaexYw")
dp = Dispatcher()

# Yangi usulda handler registratsiyasi
@dp.message(Command("start"))
async def start_handler(message: types.Message):
    await message.answer("🚀 Dubai City Bot ishga tushdi!")

async def on_startup(app):
    await bot.set_webhook("https://dubai-city-bot.onrender.com")

app = web.Application()
SimpleRequestHandler(dp, bot=bot).register(app, path="/")
app.on_startup.append(on_startup)

if __name__ == "__main__":
    web.run_app(app, host="0.0.0.0", port=8000)