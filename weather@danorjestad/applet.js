const Applet = imports.ui.applet;
const Soup = imports.gi.Soup;
const glib = imports.gi.GLib;

const _session = new Soup.SessionSync();

function main(metadata, orientation, panel_height, instance_id) {
    return new Weather(orientation, panel_height, instance_id);
}

/* Object to represent the forecast for a specific time (period) */
function new_forecast() {
    return {
        valid_time: null,
        temp: null,
        vis: null,
        ws: null,
        rain: null,
        rel_hum: null,
        thunder_prob: null,
        wsymb: null,
        cloudiness: null
    };
}

function Weather(orientation, panel_height, instance_id) {
    this._init(orientation, panel_height, instance_id);
}

Weather.prototype = {
    /* due to lack of sprintf, this will do for simplicity
     * full URL is constructed in #_getData() and #updateData() */
    _baseURL: "https://opendata-download-metfcst.smhi.se/api/category/pmp3g/" +
        "version/2/geotype/point/lon/",
    /* Default coordinates point to Umeå */
    _lon: 20.307247,
    _lat: 63.838241,
    /* how often should updateData run (in minutes) */
    _refreshRate: 15,
    /* how many forecasts should show in the popup */
    _noForecasts: 12,

    _data: null,

    __proto__: Applet.TextIconApplet.prototype,

    _init: function(orientation, panel_height, instance_id) {
        Applet.TextIconApplet.prototype._init.call(this, orientation,
            panel_height, instance_id);
        //this.set_applet_icon_symbolic_name("weather-sun");
        this.set_applet_tooltip(_("Weather"));
        this.set_applet_label(_("Loading..."));
        this._getData();

        glib.timeout_add(glib.PRIORITY_DEFAULT, this._refreshRate * 60, () => {
            this.updateData();
            return true; /* repeat */
        }, null);

        this.weatherNow();
    },

    /**
     * Set the latitute and longitude to another loc than hard-coded defaults
     */
    setLoc: function(lat, lon) {
        this._lat = lat;
        this._lon = lon;
    },

    /**
     * Synchronously gets data from the SMHI-server -- only really meant to be
     * used when starting.
     *
     * In case of an error or unexpected result, an Error is thrown but
     * not handled.
     */
    _getData: function() {
        let url = this._baseURL + this._lon + "/lat/" + this._lat + "/data.json";
        let msg = Soup.Message.new('GET', url);

        if (!msg)
            new Error("msg null in _getData");

        let resp = _session.send_message(msg);
        if (resp != 200)
            new Error("Response is " + resp + " expected 200.");
        if (!msg.response_body || !msg.response_body.data)
            new Error("Response or data is null.");

        this._data = JSON.parse(msg.response_body.data);
    },

    /**
     * Asynchronously update the data -- should be called every now and then
     * (at least hourly).
     *
     * In case of an error or unexpected result, an Error is thrown but 
     * not handled.
     */
    updateData: function() {
        let url = this._baseURL + this._lon + "/lat/" + this._lat + "/data.json";
        let msg = Soup.Message.new('GET', url);

        if (!msg)
            new Error("msg null in updateData");

        _session.queue_message(msg, (sess, msg) => {
            this._data = JSON.parse(msg.response_body.data);
        });
    },

    /* ---- */

    /**
     * Get a forecast for this very hour.
     */
    weatherNow: function() {
        if (!this._data)
            this._getData();

        return _parse_single(this._data.timeSeries[0]);
    },

    /**
     * Parses a single object from _data.timeSeries into a Forecast object
     */
    _parse_single: function(obj) {
        let forecast = new_forecast();
        forecast.valid_time = new Date(obj.valid_time);

        let i = 0;
        let param = obj.parameters[i];
        while (param[i]) {
            let val = param[i].values[0];

            switch (param.name) {
                case "t":
                    forecast.temp = val;
                    break;
                case "vis":
                    forecast.vis = val;
                    break;
                case "ws":
                    forecast.ws = val;
                    break;
                case "r":
                    forecast.rel_hum = val;
                    break;
                case "tstm":
                    forecast.thunder_prob = val;
                    break;
                case "tcc_mean":
                    forecast.cloudiness = val;
                    break;
                case "Wsymb2":
                    forecast.wsymb = val;
                    break;
                case "pmedian":
                    forecast.rain = val;
                    break;
                default:
                    break;
            }
            i++;
        }

        return forecast;
    },

    a: function() {}
};
