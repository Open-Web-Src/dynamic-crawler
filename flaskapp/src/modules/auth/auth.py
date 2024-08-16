# modules/auth/auth.py
from flask import current_app, jsonify
from flask_httpauth import HTTPBasicAuth

auth = HTTPBasicAuth()


@auth.verify_password
def verify_password(username, password):
    app_username = current_app.config['USERNAME']
    app_password = current_app.config['PASSWORD']
    print("app_username")
    print(app_username)
    print("app_password")
    print(app_password)
    if username == app_username and password == app_password:
        return username
    return None


def register_error_handlers(app):
    @app.errorhandler(401)
    def unauthorized(error):
        print("Error when Auth")
        resp = jsonify({'message': 'Unauthorized access'})
        resp.status_code = 401
        resp.headers['WWW-Authenticate'] = 'Basic realm="MyApp"'
        return resp


def register_before_request(app):
    @app.before_request
    @auth.login_required
    def before_request():
        # This function does not need any logic; the decorator does the job
        pass
