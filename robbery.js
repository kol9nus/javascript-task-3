'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var timePattern = /^(?:([а-я]{2})\s)?(\d{2}):(\d{2})\+(\d+)$/i;
var dayByName = { 'ВС': 0, 'ПН': 1, 'ВТ': 2, 'СР': 3, 'ЧТ': 4 };
var nameByDay = Object.keys(dayByName);

var DEFAULT_YEAR = 1970;
var DEFAULT_MONTH = 0;

var BANK_WORKDAYS = nameByDay.slice(1, 4);

var MINUTE_MS = 60 * 1000;
var TRY_LATER_DELAY_MS = 30 * MINUTE_MS;

var bankTimeZone = 0;

/**
 * Алгоритм получения подходящего времени следующий: сначала выстраиваем все времена участников и
 * банка во временной шкале с идентификатором того, чьё это время. После этого идём по этой
 * временной шкале и на каждом времени смотрим, если банк встретился нечётное кол-во раз,
 * а участники чётное, то промежуток до следующего времени - это промежуток
 * "когда все могут". Проверяем, достаточно ли он длинный по времени, если да, запоминаем его.
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    bankTimeZone = timePattern.exec(workingHours.from)[4];

    var timeline = createTimeline(schedule, workingHours);

    return {

        _lastIndex: 0,
        _appropriatePeriods: defineAppropriatePeriods(timeline, duration),

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return Boolean(this._appropriatePeriods[this._lastIndex]);
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            return this.exists()
                ? formatTimestamp(template, this._appropriatePeriods[this._lastIndex].from)
                : '';
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            return this.exists() && (this._tryLaterInSamePeriod() || this._tryLaterInNextPeriods());
        },

        /**
         * Попробовать позже в этот же период времени
         * @returns {boolean}
         */
        _tryLaterInSamePeriod: function () {
            var period = this._appropriatePeriods[this._lastIndex];
            var newPeriodBeginning = period.from + TRY_LATER_DELAY_MS;
            if (newPeriodBeginning + duration * MINUTE_MS <= period.to) {
                period.from += TRY_LATER_DELAY_MS;

                return true;
            }

            return false;
        },

        /**
         * Попробовать позже, но в следующий подходящий период
         * @returns {boolean}
         */
        _tryLaterInNextPeriods: function () {
            // Есть ли ещё подходящие периоды
            var i = this._lastIndex + 1;
            if (i >= this._appropriatePeriods.length) {
                return false;
            }

            var lastAppropriate = this._appropriatePeriods[this._lastIndex];
            while (lastAppropriate.from + TRY_LATER_DELAY_MS > this._appropriatePeriods[i].from) {
                i++;
                if (i === this._appropriatePeriods.length) {
                    return false;
                }
            }
            this._lastIndex = i;

            return true;
        }
    };
};

/**
 * Создание временной прямой со всеми временами на ней
 * @param {Object} schedule
 * @param {Object} workingHours
 * @returns {Array}
 */
function createTimeline(schedule, workingHours) {
    var timeline = [];
    addBankWorkingTime(timeline, workingHours);
    addGangAppropriateTimes(timeline, schedule);

    timeline.sort(function (a, b) {
        return a.timestamp - b.timestamp;
    });

    return timeline;
}

/**
 * @param {Array} timeline
 * @param {object} workingHours
 */
function addBankWorkingTime(timeline, workingHours) {

    BANK_WORKDAYS.forEach(function (day) {
        addPeriod(timeline, workingHours, 0, day);
    });
}

/**
 * @param {Array} timeline
 * @param {object} schedule
 */
function addGangAppropriateTimes(timeline, schedule) {
    Object.keys(schedule).forEach(function (person, personIndex) {
        schedule[person].forEach(function (period) {
            addPeriod(timeline, period, personIndex + 1);
        });
    });
}

/**
 * Добавляет к timeline времена из period с идентификтором id на определённый день day
 * @param {Array} timeline
 * @param {Object} period
 * @param {Number} id
 * @param {String} [day] - день для добавления времени
 */
function addPeriod(timeline, period, id, day) {
    timeline.push(
        {
            timestamp: dateToTimestamp(period.from, day),
            id: id
        },
        {
            timestamp: dateToTimestamp(period.to, day),
            id: id
        }
    );
}

/**
 * @param {string} time - время формата (DD )HH:MM+Z(Z)
 * @param {string} [day] - день, если формат time HH:MM+Z(Z)
 * @returns {Number} - timestamp
 */
function dateToTimestamp(time, day) {
    var parsedTime = timePattern.exec(time);

    return Date.UTC(
        DEFAULT_YEAR,
        DEFAULT_MONTH,
        Number(dayByName[(day !== undefined ? day : parsedTime[1])] - 1),
        // Приводим к одной временной зоне (банковской); +24 чтобы не было отриц. часов
        Number(parsedTime[2]) - Number(parsedTime[4]) + Number(bankTimeZone) + 24,
        Number(parsedTime[3])
    );
}

/**
 * Определение достаточно длинных для ограбления отрезков времени
 * @param {Array} timeline - массив обхектов вида { timestamp, id }
 * @param {Number} duration - Время необходимое для ограбления
 * @returns {Array}
 */
function defineAppropriatePeriods(timeline, duration) {
    var periods = [];
    // Доступность банка и участников для ограбления в это время
    var availabilities = [false, true, true, true]; // 0 - bank, 1 - Danny, 2 - Rusty, 3 - Linus
    var lastFoundedTime = {};
    timeline.forEach(function (time) {
        if (availabilities.every(Boolean)) {
            var timeForRobbing = time.timestamp - lastFoundedTime.timestamp;
            if (timeForRobbing >= duration * MINUTE_MS) {
                periods.push({
                    from: lastFoundedTime.timestamp,
                    to: time.timestamp
                });
            }
        }
        availabilities[time.id] = !availabilities[time.id];
        lastFoundedTime = time;
    });

    return periods;
}

/**
 * Формирует строку из timestamp, шаблон которой задан template
 * @param {String} template - шаблон сообщения
 * @param {Number} timestamp - время в миллисекундах
 * @returns {String} время начала удовлетворяющее шаблону template
 */
function formatTimestamp(template, timestamp) {
    var date = new Date(timestamp);
    var temp = date.getUTCDate();
    var day = nameByDay[temp];
    var hour = addLeadingZeroIfNecessary(date.getUTCHours());
    var minute = addLeadingZeroIfNecessary(date.getMinutes());

    return template.replace(/%HH/, hour)
        .replace(/%MM/, minute)
        .replace(/%DD/, day);
}

/**
 * Добавляет ведущий ноль, если number < 10
 * @param {Number} number
 * @returns {String}
 */
function addLeadingZeroIfNecessary(number) {
    return number < 10 ? '0' + number : number.toString();
}
