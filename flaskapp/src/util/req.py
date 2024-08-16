def get_pagination(page_size=None, page=None):
    if page_size is None:
        page_size = 10
    if page is None:
        page = 1

    offset = (int(page) - 1) * int(page_size)
    return int(page_size), int(offset), int(page)
