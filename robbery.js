'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var timePattern = /^(?:([a-zа-я]{2}) )?(\d\d):(\d\d)\+(\d+)$/i;
var dayByName = { 'ВС': 0, 'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4 };
var nameByDay = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ'];

var DEFAULT_YEAR = 1970;
var DEFAULT_MONTH = 0;

var M_TO_MS_MULTIPLIER = 60 * 1000;
var HALF_HOUR_MS = 30 * M_TO_MS_MULTIPLIER;

var bankTimeZone = 0;

/**
 * Алгоритм получения подходящего времени следующий: сначала выстраиваем все времена участников и
 * банка во временной шкале с идентификатором того, чьё это время. После этого определяем
 * пересечения множеств отрезков, получая множество подходящих для ограбления промежутков
 * времени.
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    bankTimeZone = timePattern.exec(workingHours.from)[4];

    var timeLine = createTimeLine(schedule, workingHours);

    return {

        lastIndex: 0,
        appropriateMoments: defineAppropriateMoments(timeLine, duration),

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return Boolean(this.appropriateMoments[this.lastIndex]);
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!this.exists()) {
                return '';
            }

            return formatTimestamp(template, this.appropriateMoments[this.lastIndex].from);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var isItLastAppropriateTime = this.appropriateMoments.length - this.lastIndex <= 1;

            return this.exists() && (
                tryLaterInSamePeriod(this.appropriateMoments[this.lastIndex], duration) ||
                !isItLastAppropriateTime &&
                tryLaterInNextPeriods(this)
                );
        }
    };
};

/**
 * Попробовать позже в этот же период времени
 * @param {Object} appropriateMoment - подходящий временной интервал для ограбления
 * @param {Number} duration - необходимое кол-во минут для ограбления
 * @returns {boolean}
 */
function tryLaterInSamePeriod(appropriateMoment, duration) {
    var nextAppropriateTimeBeginning = appropriateMoment.from + HALF_HOUR_MS;
    if (nextAppropriateTimeBeginning + duration * M_TO_MS_MULTIPLIER <= appropriateMoment.to) {
        appropriateMoment.from += HALF_HOUR_MS;

        return true;
    }

    return false;
}

/**
 * Попробовать позже, но в следующий подходящий период
 * @param {Object} o - изменяемый объект
 * @returns {boolean}
 */
function tryLaterInNextPeriods(o) {
    var i = o.lastIndex;
    var lastAppropriate = o.appropriateMoments[i++];
    while (lastAppropriate.from + HALF_HOUR_MS > o.appropriateMoments[i].from) {
        if (i + 1 === o.appropriateMoments.length) {
            return false;
        }
        i++;
    }
    o.lastIndex = i;

    return true;
}

/**
 * @param {Array} timeLine
 * @param {object} workingHours
 */
function addBankWorkingTimeToTimeLine(timeLine, workingHours) {

    var keys = ['ПН', 'ВТ', 'СР'];
    for (var i = 0; i < keys.length; i++) {
        timeLine.push(
            {
                timestamp: parseTime(keys[i] + ' ' + workingHours.from),
                identifier: 0
            },
            {
                timestamp: parseTime(keys[i] + ' ' + workingHours.to),
                identifier: 0
            }
        );
    }
}

/**
 * @param {Array} timeLine
 * @param {object} schedule
 */
function addGangAppropriateTime(timeLine, schedule) {
    Object.keys(schedule).forEach(function (key, index) {
        schedule[key].forEach(function (element) {
            timeLine.push(
                {
                    timestamp: parseTime(element.from),
                    identifier: index + 1
                },
                {
                    timestamp: parseTime(element.to),
                    identifier: index + 1
                }
            );
        });
    });
}

/**
 * @param {string} time
 * @returns {int} - timestamp
 */
function parseTime(time) {
    var parsedTime = timePattern.exec(time);

    return Date.UTC(
        DEFAULT_YEAR,
        DEFAULT_MONTH,
        Number(dayByName[parsedTime[1]]) - 1,
        // Приводим к одной временной зоне (банковской); +24 чтобы не было отриц. часов
        Number(parsedTime[2]) - Number(parsedTime[4]) + Number(bankTimeZone) + 24,
        Number(parsedTime[3])
    );
}

/**
 * Глупая функция, просто возвращающая своё значение
 * @param {Boolean} variable
 * @returns {Boolean}
 */
function isTrue(variable) {
    return variable;
}

/**
 * Формирует строку, шаблон которой задан template, из timestamp
 * @param {String} template - шаблон сообщения
 * @param {Number} timestamp - время в миллисекундах
 * @returns {String} время начала удовлетворяющее шаблону template
 */
function formatTimestamp(template, timestamp) {
    var date = new Date(timestamp);
    var temp = date.getUTCDate();
    var day = (nameByDay[temp]).toString();
    var hour = date.getUTCHours() < 10 ? '0' + date.getUTCHours() : date.getUTCHours().toString();
    var minute = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes().toString();

    return template.replace(/%HH/, hour)
        .replace(/%MM/, minute)
        .replace(/%DD/, day);
}

/**
 * Создание временной прямой со всеми точками на ней
 * @param {Object} schedule
 * @param {Object} workingHours
 * @returns {Array}
 */
function createTimeLine(schedule, workingHours) {
    var result = [];
    addBankWorkingTimeToTimeLine(result, workingHours);
    addGangAppropriateTime(result, schedule);

    result.sort(function (a, b) {
        return a.timestamp - b.timestamp;
    });

    return result;
}

/**
 * Определение достаточных для ограбления отрезков времени
 * @param {Array} timeLine - массив обхектов вида { timestamp, identifier }
 * @param {Number} duration - Время необходимое для ограбления
 * @returns {Array}
 */
function defineAppropriateMoments(timeLine, duration) {
    var appropriateMoments = [];
    // Доступность банка и участников для ограбления в это время
    var availabilities = [false, true, true, true]; // 0 - bank, 1 - Danny, 2 - Rusty, 3 - Linus
    var lastFoundedElement = {};
    timeLine.forEach(function (element) {
        if (availabilities.every(isTrue)) {
            var timeForRobbing = element.timestamp - lastFoundedElement.timestamp;
            if (timeForRobbing >= duration * M_TO_MS_MULTIPLIER) {
                appropriateMoments.push(
                    {
                        from: lastFoundedElement.timestamp,
                        to: element.timestamp
                    }
                );
            }
        }
        availabilities[element.identifier] = !availabilities[element.identifier];
        lastFoundedElement = element;
    });

    return appropriateMoments;
}
