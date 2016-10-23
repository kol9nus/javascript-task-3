'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var timePattern = /^(?:([a-zа-я]{2}) )?(\d\d):(\d\d)\+(\d+)$/i;
var dayByName = { undefined: 0, 'ВС': 1, 'ПН': 2, 'ВТ': 3, 'СР': 4, 'ЧТ': 5 };
var nameByDay = [undefined, 'ВС', 'ПН', 'ВТ', 'СР', 'ЧТ'];

var DEFAULT_YEAR = 1970;
var DEFAULT_MONTH = 0;

var bankTimeZone = 0;

/**
 * Алгоритм получения подходящего времени следующий: сначала выстраиваем все времена участников и
 * банка во временной шкале с идентификатором того, чьё это время. После этого определяем
 * пересечение всех 4 множеств отрезков, получая множество подходящих для ограбления промежутков
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

    var timeLine = [];
    addBankWorkingTimeToTimeLine(timeLine, workingHours);
    addGangAppropriateTime(timeLine, schedule);

    timeLine.sort(function (a, b) {
        return a.timestamp - b.timestamp;
    });

    var appropriateMoments = [];
    var isAlreadyOccurred = [false, true, true, true];
    var lastFoundedElement = {};
    timeLine.forEach(function (element) {
        if (isAlreadyOccurred.every(isTrue)) {
            if (element.timestamp - lastFoundedElement.timestamp >= duration * 60 * 1000) {
                appropriateMoments.push(
                    {
                        from: lastFoundedElement.timestamp,
                        to: element.timestamp
                    }
                );
            }
        }
        isAlreadyOccurred[element.identifier] = !isAlreadyOccurred[element.identifier];
        lastFoundedElement = element;
    });
    var i = 0;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return appropriateMoments.length > 0;
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

            return timestampToTimeByTemplate(appropriateMoments[i].from, template);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var afterNMillisec = 30 * 60000;
            var durationMillisec = duration * 60000;
            if (appropriateMoments[i].from + afterNMillisec + durationMillisec <=
                appropriateMoments[i].to) {
                appropriateMoments[i].from = appropriateMoments[i].from + afterNMillisec;

                return true;
            }

            if (appropriateMoments.length - i <= 1) {
                return false;
            }

            var lastAppropriate = appropriateMoments[i++];
            while (lastAppropriate + afterNMillisec > appropriateMoments[i].from) {
                if (i + 1 === appropriateMoments.length) {
                    return false;
                }
                i++;
            }

            return true;
        }
    };
};

/**
 * @param {Array} timeLine
 * @param {object} workingHours
 */
function addBankWorkingTimeToTimeLine(timeLine, workingHours) {

    var keys = Object.keys(dayByName);
    for (var i = 2; i < keys.length - 1; i++) {
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

function isTrue(variable) {
    return variable;
}

function timestampToTimeByTemplate(timestamp, template) {
    var date = new Date(timestamp);
    var temp = date.getUTCDate();
    var day = nameByDay[temp].toString();
    var hour = date.getUTCHours() < 10 ? '0' + date.getUTCHours() : date.getUTCHours().toString();
    var minute = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes().toString();

    return template.replace(/%HH/, hour)
        .replace(/%MM/, minute)
        .replace(/%DD/, day);
}
