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

def escape_css_class(cls):
    return re.sub(r'([^a-zA-Z0-9_-])', r'\\\1', cls)

def find_element_by_multiple_attributes(driver, action):
    locators = []
    
    element_id = action.get('elementId')
    if element_id:
        locators.append((By.ID, element_id))
    
    element_classes = action.get('elementClasses')
    if element_classes and isinstance(element_classes, list):
        escaped_classes = [escape_css_class(cls) for cls in element_classes]
        class_selector = ''.join([f".{cls}" for cls in escaped_classes])
        locators.append((By.CSS_SELECTOR, class_selector))
    
    tag_name = action.get('element')
    if tag_name:
        locators.append((By.TAG_NAME, tag_name))
    
    value = action.get('value', '')
    if value:
        locators.append((By.XPATH, f"//*[contains(text(), '{value}')]"))
    
    path = action.get('path')
    if path:
        xpath = '//' + re.sub(r'>', '/', path).strip()
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

def worker(params):
    chrome_options = Options()
    # chrome_options.add_argument("--headless")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=chrome_options)
    
    try:
        workflow = params.get('workflow', [])
        
        for action in workflow:
            action_type = action.get('type')
            
            if action_type == 'initial_href':
                driver.get(action['href'])
                print(f"Navigated to: {action['href']}")
            
            elif action_type == 'mousemove':
                try:
                    x, y = adjust_coordinates(driver, action['x'], action['y'])
                    element = driver.execute_script(f"return document.elementFromPoint({x}, {y});")
                    if element:
                        ActionChains(driver).move_to_element(element).perform()
                        print(f"Moved mouse to element at ({x}, {y})")
                    else:
                        print(f"No element found at ({x}, {y})")
                except Exception as e:
                    print(f"Error moving mouse: {str(e)}")
            
            elif action_type == 'click':
                try:
                    element = find_element_by_multiple_attributes(driver, action)
                    if element:
                        driver.execute_script("arguments[0].scrollIntoView({behavior: 'auto', block: 'center', inline: 'center'});", element)
                        # Use text content to ensure we're clicking the right element
                        if action.get('value') == "See all companies":
                            element = driver.find_element(By.XPATH, "//a[contains(text(), 'See all companies')]")
                        ActionChains(driver).move_to_element(element).click().perform()
                        print(f"Clicked element: {action.get('value') or 'N/A'}")
                    else:
                        print(f"Element not found for click action: {action}")
                        x, y = adjust_coordinates(driver, action['x'], action['y'])
                        driver.execute_script(f"document.elementFromPoint({x}, {y}).click();")
                        print(f"Attempted JavaScript click at coordinates: ({x}, {y})")
                except Exception as e:
                    print(f"Error clicking element: {str(e)}")
            
            elif action_type == 'scroll':
                try:
                    scroll_x, scroll_y = adjust_coordinates(driver, action.get('scrollX', 0), action.get('scrollY', 0))
                    driver.execute_script(f"window.scrollTo({scroll_x}, {scroll_y});")
                    print(f"Scrolled to: ({scroll_x}, {scroll_y})")
                except Exception as e:
                    print(f"Error scrolling: {str(e)}")
            
            elif action_type == 'input':
                try:
                    element = find_element_by_multiple_attributes(driver, action)
                    if element:
                        element.clear()
                        element.send_keys(action['value'])
                        print(f"Entered text: '{action['value']}' into element: {action.get('value') or 'N/A'}")
                    else:
                        print(f"Element not found for input action: {action}")
                except Exception as e:
                    print(f"Error entering text: {str(e)}")
            
            else:
                print(f"Unknown action type: {action_type}")
            
            time.sleep(0.5)
        
        print("Workflow executed successfully")
    except Exception as e:
        print(f"Error executing workflow: {str(e)}")
    finally:
        driver.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--params', type=str, help='Params for worker')
    args = parser.parse_args()
    params = json.loads(args.params)

    worker(params)