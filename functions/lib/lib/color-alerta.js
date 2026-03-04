"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRAVEDAD_A_COLOR = void 0;
exports.gravedadToColorAlerta = gravedadToColorAlerta;
exports.GRAVEDAD_A_COLOR = {
    1: "green",
    2: "yellow",
    3: "orange",
    4: "red",
    5: "darkred",
};
function gravedadToColorAlerta(gravedad) {
    return exports.GRAVEDAD_A_COLOR[gravedad];
}
