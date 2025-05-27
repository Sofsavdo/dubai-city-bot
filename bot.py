from aiogram import Bot, Dispatcher, types 
from aiogram.webhook.aiohttp_server import SimpleRequestHandler 
from aiohttp import web 
 
bot = Bot(token="7250623185:AAHVlFPvR5ypisUnngoJ7hhI_6NmyfTDj0Q") 
dp = Dispatcher(bot) 
 
@dp.message_handler(commands=['start']) 
async def start(message: types.Message): 
    await message.answer("?? Dubai City Botga xush kelibsiz!") 
 
async def on_startup(app): 
    await bot.set_webhook("https://your-bot-name.onrender.com") 
 
app = web.Application() 
SimpleRequestHandler(dp).register(app, path="/") 
app.on_startup.append(on_startup) 
 
if __name__ == "__main__": 
    web.run_app(app, port=8000) 
