import json
import os
import sys


def generate_imagedefinitions(container_name, image_uri, output_file):
    image_definitions = [
        {
            "name": container_name,
            "imageUri": image_uri
        }
    ]

    with open(output_file, 'w') as f:
        json.dump(image_definitions, f)


if __name__ == "__main__":
    container_name = os.getenv(sys.argv[1])
    image_uri = sys.argv[2]
    output_file = sys.argv[3]
    generate_imagedefinitions(container_name, image_uri, output_file)
