from flask import jsonify
from flask.views import MethodView
from db import check_db_connection


class HealthCheckService(MethodView):
    def get(self):
        db_status = check_db_connection()
        status = {
            "status": "healthy" if db_status else "unhealthy",
            "database": "connected" if db_status else "disconnected"
        }
        return jsonify(status), 200 if db_status else 500
