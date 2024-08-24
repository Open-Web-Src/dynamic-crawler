from flask import Flask, jsonify
from flask_httpauth import HTTPBasicAuth
from config import Config
from routes import app_bp
from init_db import initialize_configuration
from modules.auth.auth import register_error_handlers, register_before_request
from flask_cors import CORS
# from aws_xray_sdk.core import xray_recorder
# from aws_xray_sdk.ext.flask.middleware import XRayMiddleware


app = Flask(__name__)
app.config.from_object(Config)

# Add CORS support
CORS(app, supports_credentials=True, allow_headers=[
     "Authorization", "X-Requested-With", "Content-Type", "Accept"])

# Register X-Ray middleware
# xray_recorder.configure(service='FlaskApp')  # Set a name for the service
# XRayMiddleware(app, xray_recorder)

register_error_handlers(app)
register_before_request(app)

app.register_blueprint(app_bp)

with app.app_context():
    initialize_configuration()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
