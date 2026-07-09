FROM nvidia/cuda:12.8.1-cudnn-devel-ubuntu22.04

WORKDIR /app

RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m pip install --upgrade pip

RUN pip install --no-cache-dir \
    --index-url https://download.pytorch.org/whl/cu128 \
    torch==2.8.0+cu128 torchvision==0.23.0+cu128

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY masking_handler.py .

CMD ["python3", "-u", "masking_handler.py"]
