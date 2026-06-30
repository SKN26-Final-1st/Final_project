
def recursive_alter(data, target: str, result: str):
    if isinstance(data, str):
        return data.replace(target, result)

    if isinstance(data, list):
        return [recursive_alter(item, target, result) for item in data]

    if isinstance(data, dict):
        return {
            key: recursive_alter(value, target, result)
            for key, value in data.items()
        }

    return data
