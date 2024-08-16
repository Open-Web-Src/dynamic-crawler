from flask import jsonify


def success(data=None):
    return jsonify({"status": "success", "data": data})


def error(error_code=None):
    return jsonify({"status": "error", "message": error_code})


def success_with_pagination(
    data=None,
    total=None,
    page=1,
    limit=10,
):
    return jsonify(
        {
            "status": "success",
            "data": data,
            "page": page,
            "page_size": limit,
            "total": total,
        }
    )
