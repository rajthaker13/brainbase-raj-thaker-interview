import argparse
import json
import time
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import undetected_chromedriver as uc

def escape_css_class(cls):
    return re.sub(r'([^a-zA-Z0-9_-])', r'\\\1', cls)

def find_element_by_multiple_attributes(driver, element_info):
    locators = []
    
    if element_info.get('id'):
        locators.append((By.ID, element_info['id']))
    
    if element_info.get('classes'):
        class_selector = '.'.join(element_info['classes'])
        locators.append((By.CSS_SELECTOR, f".{class_selector}"))
    
    if element_info.get('tagName'):
        locators.append((By.TAG_NAME, element_info['tagName']))
    
    if element_info.get('textContent'):
        locators.append((By.XPATH, f"//*[contains(text(), '{element_info['textContent']}')]"))
    
    if element_info.get('path'):
        xpath = '//' + '/'.join(element_info['path'].split(' > '))
        locators.append((By.XPATH, xpath))
    
    for by, value in locators:
        try:
            element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((by, value)))
            return element
        except (TimeoutException, NoSuchElementException):
            continue
    
    return None

def adjust_coordinates(driver, x, y):
    viewport_width = driver.execute_script("return window.innerWidth;")
    viewport_height = driver.execute_script("return window.innerHeight;")
    recorded_width = 1920  # Assume this was the width during recording
    recorded_height = 1080  # Assume this was the height during recording
    
    adjusted_x = int(x * (viewport_width / recorded_width))
    adjusted_y = int(y * (viewport_height / recorded_height))
    
    return adjusted_x, adjusted_y

def load_cookies(driver, cookies):
    for cookie in cookies:
        if 'expiry' in cookie:
            del cookie['expiry']
        try:
            driver.add_cookie(cookie)
        except:
            pass  # Silently ignore any cookie-setting errors

def worker(params):
    options = uc.ChromeOptions()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-blink-features=AutomationControlled")
    driver = uc.Chrome(options=options)
    
    try:
        workflow = params.get('workflow', [])
        
        for action in workflow:
            action_type = action.get('type')
            
            if action_type in ['initial_href', 'href']:
                current_url = driver.current_url
                target_url = action['href']
                
                if current_url != target_url:
                    driver.get(target_url)
                    print(f"Navigated to: {target_url}")
                    
                    # Wait for the page to load
                    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                    time.sleep(2)  # Additional wait to ensure page is fully loaded
                
                # Set cookies without refreshing the page
                if 'cookies' in action:
                    set_cookies(driver, action['cookies'])
            
            elif action_type == 'click':
                element = find_and_wait_for_element(driver, action['targetElement'])
                if element:
                    element.click()
                    print(f"Clicked element: {action['targetElement'].get('tagName', 'N/A')}")
                    time.sleep(1)  # Wait for any potential page changes after click
            
            elif action_type == 'input':
                element = find_and_wait_for_element(driver, action['targetElement'])
                if element:
                    element.clear()
                    element.send_keys(action['targetElement']['textContent'])
                    print(f"Entered text: '{action['targetElement']['textContent']}' into element")
                    time.sleep(0.5)  # Short wait after input
            
            elif action_type == 'mousemove':
                # Ignore mousemove actions
                pass
            
            else:
                print(f"Unknown action type: {action_type}")
            
            # Check if page has changed unexpectedly
            if driver.current_url != target_url:
                print(f"Page changed unexpectedly to: {driver.current_url}")
        
        print("Workflow executed successfully")
    except Exception as e:
        print(f"Error executing workflow: {str(e)}")
    finally:
        driver.quit()

def set_cookies(driver, cookies):
    for cookie in cookies:
        try:
            cookie_copy = {k: v for k, v in cookie.items() if k in ['name', 'value', 'domain', 'path']}
            if cookie_copy['domain'].startswith('.'):
                cookie_copy['domain'] = cookie_copy['domain'][1:]
            if cookie_copy['domain'] in driver.current_url:
                driver.add_cookie(cookie_copy)
        except:
            pass  # Silently ignore any cookie-setting errors

def find_and_wait_for_element(driver, element_info):
    locators = get_locators(element_info)
    for by, value in locators:
        try:
            element = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((by, value)))
            return element
        except:
            continue
    print(f"Element not found: {element_info}")
    return None

def get_locators(element_info):
    locators = []
    if element_info.get('id'):
        locators.append((By.ID, element_info['id']))
    if element_info.get('classes'):
        locators.append((By.CSS_SELECTOR, '.' + '.'.join(element_info['classes'])))
    if element_info.get('tagName'):
        locators.append((By.TAG_NAME, element_info['tagName']))
    if element_info.get('textContent'):
        locators.append((By.XPATH, f"//*[contains(text(), '{element_info['textContent']}')]"))
    if element_info.get('path'):
        locators.append((By.XPATH, '//' + '/'.join(element_info['path'].split(' > '))))
    return locators

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--params', type=str, help='Params for worker')
    args = parser.parse_args()
    params = json.loads(args.params)

    worker(params)