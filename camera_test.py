import cv2
import time

print('Press q to quit each preview window.')

for i in range(5):
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        print(f'Camera {i} is available. Showing preview...')
        for _ in range(100): 
            ret, frame = cap.read()
            if not ret:
                break
            cv2.imshow(f'Camera {i}', frame)
            if cv2.waitKey(30) & 0xFF == ord('q'):
                break
        cap.release()
        cv2.destroyAllWindows()
    else:
        print(f'Camera {i} is not available.')
    time.sleep(1) 