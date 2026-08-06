from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source = TTFont("app/fonts/PretendardVariable.woff2")
source.flavor = None
static_font = instantiateVariableFont(source, {"wght": 500}, inplace=False, optimize=True)
static_font.save("app/fonts/PretendardPDF.ttf")
