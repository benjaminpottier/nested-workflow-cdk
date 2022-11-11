#!/usr/bin/env python

import time
import json
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    logger.info(json.dumps(event))
    time.sleep(10)
    return event