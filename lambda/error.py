#!/usr/bin/env python

import json
import logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def handler(event, context):
    logger.info(json.dumps(event))
    logger.info("Handle it!")
    #return event